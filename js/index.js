// 1. Ejecutar OCR al pulsar el botón
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
            // Rellenar automáticamente algunos campos del formulario
            document.getElementById("facturaNumero").value = datos.numeroFactura || "";
            document.getElementById("facturaFecha").value = datos.fecha || "";
            document.getElementById("facturaNIT").value = datos.nit || "";
            document.getElementById("facturaTotal").value = datos.total || "";
            document.getElementById("facturaCodGen").value = datos.codGeneracion || "";
            document.getElementById("facturaNumControl").value = datos.numControl || "";
            document.getElementById("facturaSello").value = datos.sello || "";
            // Asignar datos del emisor (si se detectan)
            if (datos.nit) document.getElementById("emisorNIT").value = datos.nit;
        })
        .catch(err => {
            console.error("Error en OCR:", err);
            alert("Error al ejecutar OCR.");
        });
});

// Función para extraer datos clave usando expresiones regulares
function extraerDatosFactura(text) {
    var datos = {};
    var numMatch = text.match(/Factura\s*#?\s*(\d+)/i);
    datos.numeroFactura = numMatch ? numMatch[1] : "";
    var fechaMatch = text.match(/(\d{4}-\d{2}-\d{2})/); // Fecha en formato ISO extraída de "Fecha y Hora de Generacién"
    datos.fecha = fechaMatch ? fechaMatch[1] : "";
    var nitMatch = text.match(/NIT[:\s]*([\d\-]+)/i);
    datos.nit = nitMatch ? nitMatch[1] : "";
    var totalMatch = text.match(/Total[:\s]*\$?([\d.,]+)/i);
    datos.total = totalMatch ? totalMatch[1] : "";
    var codGenMatch = text.match(/C[eé]digo\s+de\s+Generac[ií]on:\s*([\w\-]+)/i);
    datos.codGeneracion = codGenMatch ? codGenMatch[1].trim() : generarUUID();
    var numControlMatch = text.match(/Numero\s+de\s+Control:\s*(\S+)/i);
    datos.numControl = numControlMatch ? numControlMatch[1].trim() : generarNumeroControl();
    var selloMatch = text.match(/Sello\s+de\s+Recepci[eé]n:\s*([\w\s]+)/i);
    datos.sello = selloMatch ? selloMatch[1].trim() : "";
    return datos;
}

// Función para generar un UUID (para el Código de Generación)
function generarUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = (c === "x" ? r : (r & 0x3 | 0x8));
        return v.toString(16);
    }).toUpperCase();
}

// Función para generar un Número de Control (simplificado)
function generarNumeroControl() {
    return "DTE-01-00000001-000000000000001";
}

// Función para calcular IVA (tasa 13%) con redondeo a 2 decimales
function calcularIVA(total) {
    var num = parseFloat(total.replace(",", "."));
    if (isNaN(num)) return "0.00";
    return (num * 0.13).toFixed(2);
}

// Función para redondear valores de ítems a 8 decimales
function redondearItem(valor) {
    var num = parseFloat(valor.replace(",", "."));
    if (isNaN(num)) return "0.00000000";
    return num.toFixed(8);
}

// Función para firmar digitalmente el JSON del DTE usando JWS
function firmarDTE(jsonDTE) {
    // Clave privada simulada (en producción se usará una clave segura y certificada)
    var clavePrivada = "-----BEGIN PRIVATE KEY-----\nMIICeAIBADANBgkqhkiG9w0BAQEFAASCAmIwggJeAgEAAoGBAMj...TUx\n-----END PRIVATE KEY-----";
    var header = { alg: "RS256", typ: "JWT" };
    var payload = JSON.stringify(jsonDTE);
    var firma = KJUR.jws.JWS.sign("RS256", JSON.stringify(header), payload, clavePrivada);
    return firma;
}

// Función para simular la transmisión del DTE a la plataforma tributaria
function transmitirDTE(firmaDTE) {
    console.log("Transmisión del DTE:", firmaDTE);
    alert("DTE transmitido (simulación).");
}

// 3. Generar el DTE completo y firmado
document.getElementById("generarDteBtn").addEventListener("click", function () {
    // Recopilar datos de la factura
    var facturaNumero = document.getElementById("facturaNumero").value;
    var facturaFecha = document.getElementById("facturaFecha").value;
    var facturaNIT = document.getElementById("facturaNIT").value;
    var facturaTotal = document.getElementById("facturaTotal").value;
    var facturaCodGen = document.getElementById("facturaCodGen").value;
    var facturaNumControl = document.getElementById("facturaNumControl").value;
    var facturaSello = document.getElementById("facturaSello").value;

    // Datos del Emisor
    var emisor = {
        nit: document.getElementById("emisorNIT").value || facturaNIT,
        nrc: document.getElementById("emisorNRC").value || "",
        nombre: document.getElementById("emisorNombre").value || "Portillo Materiales Eléctricos, S.A. de C.V.",
        direccion: document.getElementById("emisorDireccion").value || "Sta. Av. Norte Barrio San Francisco #401, San Miguel",
        telefono: document.getElementById("emisorTelefono").value || "26608300",
        correo: document.getElementById("emisorCorreo").value || "ventas@portilloelectricos.com"
    };

    // Datos del Receptor
    var receptor = {
        nombre: document.getElementById("receptorNombre").value || "CLIENTES VARIOS",
        nit: document.getElementById("receptorNIT").value || "",
        telefono: document.getElementById("receptorTelefono").value || "26608300",
        correo: document.getElementById("receptorCorreo").value || "portilloelectricos@gmail.com"
    };

    // Datos del Ítem
    var item = {
        numItem: 1,
        tipItem: 2,
        cantidad: redondearItem(document.getElementById("itemCantidad").value),
        codigo: document.getElementById("itemCodigo").value || facturaNumero,
        uniMedida: 99,
        descripcion: document.getElementById("itemDescripcion").value || "TENAZA P/ELECT UNIVERSAL 8 PULG. ALU208",
        precioUni: redondearItem(document.getElementById("itemPrecioUni").value),
        montoDescu: redondearItem(document.getElementById("itemDescuento").value),
        codTributo: null,
        ventaNoSuj: redondearItem(facturaTotal),
        ventaExenta: "0.00",
        ventaGravada: redondearItem(facturaTotal),
        tributos: [
            { codigo: "01", descripcion: "IVA", valor: calcularIVA(facturaTotal) }
        ]
    };

    // Construcción del DTE
    var dte = {
        identificacion: {
            version: 3,
            ambiente: "01", // Ejemplo: ambiente de producción (01) o prueba (00)
            tipoDte: "03", // Factura Electrónica
            numeroControl: facturaNumControl || generarNumeroControl(),
            codigoGeneracion: facturaCodGen || generarUUID(),
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
                { codigo: "01", descripcion: "IVA", valor: calcularIVA(facturaTotal) }
            ],
            subTotal: facturaTotal,
            ivaPerci1: calcularIVA(facturaTotal),
            ivaRete1: "0.00",
            reteRenta: "0.00",
            montoTotalOperacion: facturaTotal,
            totalNoGravado: "0.00",
            totalPagar: facturaTotal,
            totalletras: "Monto en letras", // Se podría integrar conversión numérica a texto
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
            observaciones: "VENTA DEL DÍA"
        },
        apendice: null,
        firmaDigital: ""
    };

    // Firmar digitalmente el DTE
    var firma = firmarDTE(dte);
    dte.firmaDigital = firma;

    // Mostrar el DTE final con firma
    document.getElementById("dteJsonOutput").innerText = JSON.stringify(dte, null, 2);

    // Simular transmisión a la plataforma tributaria
    transmitirDTE(firma);
});