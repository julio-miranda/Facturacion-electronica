// Función para preprocesar la imagen: convertir a escala de grises y aplicar umbral.
function preprocesarImagen(file, callback) {
    const canvas = document.getElementById("canvasPreview");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = function () {
        // Ajustar tamaño de canvas
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        // Obtener datos de píxeles y convertir a escala de grises
        let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            let avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            // Aplicar umbral
            let val = avg > 128 ? 255 : 0;
            data[i] = data[i + 1] = data[i + 2] = val;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(callback, "image/png");
    };
    img.src = URL.createObjectURL(file);
}

// Ejecutar preprocesamiento y OCR
document.getElementById("preprocessBtn").addEventListener("click", function () {
    var file = document.getElementById("imageInput").files[0];
    if (!file) {
        alert("Seleccione una imagen de la factura.");
        return;
    }
    preprocesarImagen(file, function (blob) {
        Tesseract.recognize(blob, "spa", {
            logger: m => console.log(m),
            // Configuración: limitar caracteres para mejorar la precisión
            config: {
                tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-:.$@, ",
                tessedit_pageseg_mode: "3"
            }
        })
            .then(({ data: { text } }) => {
                document.getElementById("ocrText").innerText = text;
                var datos = extraerDatosFactura(text);
                // Rellenar automáticamente campos del formulario
                document.getElementById("facturaNumero").value = datos.numeroFactura || "";
                document.getElementById("facturaFecha").value = datos.fecha || "";
                document.getElementById("facturaNIT").value = datos.nit || "";
                document.getElementById("facturaTotal").value = datos.total || "";
                document.getElementById("facturaCodGen").value = datos.codGeneracion || "";
                document.getElementById("facturaNumControl").value = datos.numControl || "";
                document.getElementById("facturaSello").value = datos.sello || "";
                if (datos.nit) {
                    document.getElementById("emisorNIT").value = datos.nit;
                }
            })
            .catch(err => {
                console.error("Error en OCR:", err);
                alert("Error al ejecutar OCR.");
            });
    });
});

// Función para extraer datos clave usando expresiones regulares robustas
function extraerDatosFactura(text) {
    var datos = {};

    // Número de factura
    var numMatch = text.match(/Factura\s*#?\s*(\d+)/i);
    datos.numeroFactura = numMatch && numMatch[1] ? numMatch[1].trim() : "";

    // Fecha en formato ISO
    var fechaMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    datos.fecha = fechaMatch && fechaMatch[1] ? fechaMatch[1].trim() : "";

    // NIT
    var nitMatch = text.match(/NIT[:\s]*([\d\-]+)/i);
    datos.nit = nitMatch && nitMatch[1] ? nitMatch[1].trim() : "";

    // Total
    var totalMatch = text.match(/Total[:\s]*\$?([\d.,]+)/i);
    datos.total = totalMatch && totalMatch[1] ? totalMatch[1].trim() : "";

    // Código de Generación
    var codGenMatch = text.match(/C[eé]digo\s+de\s+Generac[ií]on:\s*([\w\-\$]+)/i);
    datos.codGeneracion = codGenMatch && codGenMatch[1] ? codGenMatch[1].replace("$", "8").trim() : generarUUID();

    // Número de Control
    var numControlMatch = text.match(/Numero\s+de\s+Control:\s*(\S+)/i);
    datos.numControl = numControlMatch && numControlMatch[1] ? numControlMatch[1].trim() : generarNumeroControl();

    // Sello de Recepción
    var selloMatch = text.match(/Sello\s+de\s+Recepci[eé]n:\s*([\w\s]+)/i);
    datos.sello = selloMatch && selloMatch[1] ? selloMatch[1].trim() : "";

    return datos;
}

// Función para generar un UUID (para Código de Generación)
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
    // Clave privada simulada (usar clave certificada en producción)
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

// Generar el DTE completo y firmado
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
            ambiente: "01",
            tipoDte: "03",
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
            totalletras: "Monto en letras", // Se puede implementar conversión numérica a texto
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