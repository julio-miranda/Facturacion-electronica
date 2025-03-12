// 1. Ejecución de OCR
document.getElementById("ocrBtn").addEventListener("click", function () {
    var file = document.getElementById("imageInput").files[0];
    if (!file) {
        alert("Seleccione una imagen de la factura.");
        return;
    }
    Tesseract.recognize(file, "spa", { logger: m => console.log(m) })
        .then(({ data: { text } }) => {
            document.getElementById("ocrText").innerText = text;
            var datos = extraerDatosFactura(text);
            document.getElementById("facturaNumero").value = datos.numeroFactura || "";
            document.getElementById("facturaFecha").value = datos.fecha || "";
            document.getElementById("facturaNIT").value = datos.nit || "";
            document.getElementById("facturaTotal").value = datos.total || "";
            if (datos.nit) {
                document.getElementById("emisorNIT").value = datos.nit;
            }
        })
        .catch(err => {
            console.error("Error en OCR:", err);
            alert("Error al ejecutar OCR.");
        });
});

// Función para extraer datos básicos del texto OCR
function extraerDatosFactura(text) {
    var datos = {};
    var numMatch = text.match(/Factura\s*#?\s*(\d+)/i);
    datos.numeroFactura = numMatch ? numMatch[1] : "";
    var fechaMatch = text.match(/(\d{2}\/\d{2}\/\d{4})/);
    datos.fecha = fechaMatch ? fechaMatch[1] : "";
    var nitMatch = text.match(/NIT[:\s]*([\d\-]+)/i);
    datos.nit = nitMatch ? nitMatch[1] : "";
    var totalMatch = text.match(/Total[:\s]*([\d.,]+)/i);
    datos.total = totalMatch ? totalMatch[1] : "";
    return datos;
}

// Función para generar un UUID (Código de Generación)
function generarUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = (c === "x" ? r : (r & 0x3 | 0x8));
        return v.toString(16);
    }).toUpperCase();
}

// Función para generar un Número de Control (ejemplo simplificado)
function generarNumeroControl() {
    return "DTE-03-00000001-000000000000001";
}

// Función para calcular IVA (tasa del 13%) con redondeo a 2 decimales para resumen
function calcularIVA(total) {
    var totalNum = parseFloat(total.replace(",", "."));
    if (isNaN(totalNum)) return "0.00";
    var iva = totalNum * 0.13;
    return iva.toFixed(2);
}

// Función para redondear valores de ítems a 8 decimales
function redondearItem(valor) {
    var num = parseFloat(valor.replace(",", "."));
    if (isNaN(num)) return "0.00000000";
    return num.toFixed(8);
}

// Función para firmar digitalmente el JSON del DTE usando JWS
function firmarDTE(jsonDTE) {
    // Clave privada simulada (en producción se usará un certificado real)
    var clavePrivada = "-----BEGIN PRIVATE KEY-----\nMIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAMj...TUx\n-----END PRIVATE KEY-----";
    var header = { alg: "RS256", typ: "JWT" };
    var payload = JSON.stringify(jsonDTE);
    var firma = KJUR.jws.JWS.sign("RS256", JSON.stringify(header), payload, clavePrivada);
    return firma;
}

// Función para simular la transmisión del DTE a la Administración Tributaria
function transmitirDTE(firmaDTE) {
    console.log("Transmisión del DTE:", firmaDTE);
    alert("DTE transmitido (simulación).");
}

// 3. Generación del DTE completo y firmado
document.getElementById("generarDteBtn").addEventListener("click", function () {
    // Recopilar datos de la factura
    var facturaNumero = document.getElementById("facturaNumero").value;
    var facturaFecha = document.getElementById("facturaFecha").value;
    var facturaNIT = document.getElementById("facturaNIT").value;
    var facturaTotal = document.getElementById("facturaTotal").value;

    // Datos del Emisor
    var emisor = {
        nit: document.getElementById("emisorNIT").value || facturaNIT,
        nrc: document.getElementById("emisorNRC").value || "",
        nombre: document.getElementById("emisorNombre").value || "Emisor S.A.",
        codActividad: document.getElementById("emisorCodActividad").value,
        descActividad: document.getElementById("emisorDescActividad").value,
        nombreComercial: document.getElementById("emisorNombreComercial").value || document.getElementById("emisorNombre").value || "Emisor Comercial",
        tipoEstablecimiento: document.getElementById("emisorTipoEstablecimiento").value,
        direccion: {
            departamento: document.getElementById("emisorDepartamento").value || "00",
            municipio: document.getElementById("emisorMunicipio").value || "00",
            complemento: document.getElementById("emisorComplemento").value || "Dirección Emisor"
        },
        telefono: document.getElementById("emisorTelefono").value || "",
        correo: document.getElementById("emisorCorreo").value || "",
        codEstable: null,
        codPuntoVenta: null,
        codEstableMH: document.getElementById("emisorCodEstableMH").value,
        codPuntoVentaMH: document.getElementById("emisorCodPuntoVentaMH").value
    };

    // Datos del Receptor
    var receptor = {
        nrc: document.getElementById("receptorNRC").value || "",
        nombre: document.getElementById("receptorNombre").value || "Receptor S.A.",
        codActividad: document.getElementById("receptorCodActividad").value,
        descActividad: document.getElementById("receptorDescActividad").value || "Actividad Receptor",
        direccion: {
            departamento: document.getElementById("receptorDepartamento").value || "00",
            municipio: document.getElementById("receptorMunicipio").value || "00",
            complemento: document.getElementById("receptorComplemento").value || "Dirección Receptor"
        },
        telefono: document.getElementById("receptorTelefono").value || "",
        correo: document.getElementById("receptorCorreo").value || "",
        nombreComercial: document.getElementById("receptorNombreComercial").value || "Receptor Comercial",
        nit: document.getElementById("receptorNIT").value || ""
    };

    // Datos del Ítem
    var item = {
        numItem: 1,
        tipItem: 2,
        cantidad: redondearItem(document.getElementById("itemCantidad").value),
        codigo: facturaNumero,
        uniMedida: 99,
        descripcion: document.getElementById("itemDescripcion").value || "Producto o servicio",
        precioUni: redondearItem(document.getElementById("itemPrecioUni").value),
        montoDescu: redondearItem(document.getElementById("itemDescuento").value),
        codTributo: null,
        ventaNoSuj: redondearItem(facturaTotal),
        ventaExenta: "0.00",
        ventaGravada: redondearItem(facturaTotal),
        tributos: [
            {
                codigo: "01",
                descripcion: "IVA",
                valor: calcularIVA(facturaTotal)
            }
        ]
    };

    // Construcción del DTE completo
    var dte = {
        identificacion: {
            version: 3,
            ambiente: "00",
            tipoDte: "03",
            numeroControl: generarNumeroControl(),
            codigoGeneracion: generarUUID(),
            tipoModelo: 1,
            tipoOperacion: 1,
            fecEmi: facturaFecha || new Date().toISOString().split("T")[0],
            horEmi: new Date().toTimeString().split(" ")[0],
            tipoMoneda: "USD"
        },
        emisor: emisor,
        receptor: receptor,
        cuerpoDocumento: [item],
        resumen: {
            totalNoSuj: "0.00",
            totalExenta: "0.00",
            totalGravada: facturaTotal,
            subTotalVentas: facturaTotal,
            descuNoSuj: "0.00",
            descuExenta: "0.00",
            descuGravada: "0.00",
            porcentajeDescuento: "0.00",
            totalDescu: "0.00",
            tributos: [
                {
                    codigo: "01",
                    descripcion: "IVA",
                    valor: calcularIVA(facturaTotal)
                }
            ],
            subTotal: facturaTotal,
            ivaPerci1: calcularIVA(facturaTotal),
            ivaRete1: "0.00",
            reteRenta: "0.00",
            montoTotalOperacion: facturaTotal,
            totalNoGravado: "0.00",
            totalPagar: facturaTotal,
            totalletras: "Monto en letras", // Aquí se podría implementar conversión numérica a texto
            saldofavor: "0.00",
            condicionOperacion: 1,
            pagos: null,
            numPagoElectronico: null
        },
        extension: {
            nombEntrega: "",
            docuEntrega: "",
            nombRecibe: "",
            docuRecibe: "",
            placaVehiculo: "",
            observaciones: ""
        },
        apendice: null,
        // Campo de firma digital
        firmaDigital: ""
    };

    // Firmar digitalmente el DTE
    var firma = firmarDTE(dte);
    dte.firmaDigital = firma;

    // Mostrar el DTE final en formato JSON
    document.getElementById("dteJsonOutput").innerText = JSON.stringify(dte, null, 2);

    // Simular la transmisión del DTE firmado
    transmitirDTE(firma);
});