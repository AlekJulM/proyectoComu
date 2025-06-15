// Variables globales
let nombreJugador = '';
let letraCancion = [];
let preguntas = [];
let preguntasSeleccionadas = [];
let preguntaActualIndex = 0;
let correctCount = 0;
let temporizador = null;
let tiempoRestante = 150; // Ahora todas las preguntas tienen 150 segundos
let intervalLetra = null;
let audioTerminado = false;
let lineaActualIndex = 0;

// DOM Elements
const pantalla1 = document.getElementById('pantalla1');
const pantalla2 = document.getElementById('pantalla2');
const pantalla3 = document.getElementById('pantalla3');
const pantalla4 = document.getElementById('pantalla4');
const pantalla5 = document.getElementById('pantalla5');

// Funciones de utilidad
function mostrarPantalla(pantalla) {
    [pantalla1, pantalla2, pantalla3, pantalla4, pantalla5].forEach(p => p.classList.add('oculto'));
    pantalla.classList.remove('oculto');
}

function formatearTiempo(segundos) {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs < 10 ? '0' + segs : segs}`;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Funcionalidad para reproducir y sincronizar la letra
async function cargarLetra() {
    try {
        // Limpiar completamente el contenedor antes de cargar la letra nueva
        const letraContainer = document.getElementById('letra');
        
        // Método más efectivo para limpiar el contenedor completamente
        while (letraContainer.firstChild) {
            letraContainer.removeChild(letraContainer.firstChild);
        }
        
        const archivo = await cargarArchivo('assets/La Bella Y La Bestia.lrc');
        const lineas = archivo.split('\n');
        letraCancion = [];
        anchors = {};
        
        // Separar timestamps y texto de cada línea
        const lineaConTiempos = [];
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            if (linea.length > 0) {
                // Verificar si la línea tiene formato LRC [mm:ss.xx]
                const match = linea.match(/\[(\d+):(\d+\.\d+)\](.*)/);
                if (match) {
                    const minutos = parseInt(match[1]);
                    const segundos = parseFloat(match[2]);
                    const texto = match[3].trim();
                    
                    const tiempoTotal = minutos * 60 + segundos;
                    anchors[i] = tiempoTotal;
                    
                    lineaConTiempos.push({
                        tiempo: tiempoTotal,
                        texto: texto,
                        index: i
                    });
                }
            }
        }
        
        // Ordenar por tiempo
        lineaConTiempos.sort((a, b) => a.tiempo - b.tiempo);
        
        // Extraer solo los textos en orden
        letraCancion = lineaConTiempos.map(item => item.texto);
        
        // Mostrar la letra en el DOM
        for (let i = 0; i < letraCancion.length; i++) {
            const p = document.createElement('p');
            p.textContent = letraCancion[i];
            p.dataset.index = i;
            letraContainer.appendChild(p);
        }
        
        return true;
    } catch (error) {
        console.error("Error al cargar la letra:", error);
        return false;
    }
}

function iniciarReproduccion() {
    const audio = document.getElementById('audioCancion');
    const iconoPlay = document.getElementById('iconoPlay');
    const iconoPause = document.getElementById('iconoPause');
    
    // Asegurarnos que el audio está listo y la duración está disponible
    if (isNaN(audio.duration)) {
        audio.addEventListener('loadedmetadata', () => {
            const duracionTotal = document.getElementById('duracionTotal');
            duracionTotal.textContent = formatearTiempo(audio.duration);
            
            // Iniciar la reproducción después de cargar los metadatos
            audio.play();
            iconoPlay.classList.add('oculto');
            iconoPause.classList.remove('oculto');
            
            // Iniciar la sincronización
            sincronizarLetra();
        });
    } else {
        // Si ya está cargado, simplemente reproducir
        audio.play();
        iconoPlay.classList.add('oculto');
        iconoPause.classList.remove('oculto');
        
        // Mostrar duración
        const duracionTotal = document.getElementById('duracionTotal');
        duracionTotal.textContent = formatearTiempo(audio.duration);
        
        sincronizarLetra();
    }
    
    // Actualizar progreso y tiempo actual
    audio.addEventListener('timeupdate', () => {
        const tiempoCorriente = document.getElementById('tiempoCorriente');
        tiempoCorriente.textContent = formatearTiempo(audio.currentTime);
        
        const progresoActual = document.getElementById('progresoActual');
        const porcentaje = (audio.currentTime / audio.duration) * 100;
        progresoActual.style.width = `${porcentaje}%`;
        
        // Aplicar efecto de pulso a la bola del progreso cuando está reproduciéndose
        if (!audio.paused) {
            progresoActual.classList.add('reproduciendo');
        } else {
            progresoActual.classList.remove('reproduciendo');
        }
    });
    
    // Mostrar botón al terminar
    audio.addEventListener('ended', () => {
        audioTerminado = true;
        mostrarBotonPasarJuego();
        clearInterval(intervalLetra);
        
        // Mostrar el botón con una animación suave
        const btnPasarJuego = document.getElementById('btnPasarJuego');
        btnPasarJuego.style.animation = 'aparecer 0.8s forwards';
    });
    
    // Click en la barra de progreso para cambiar posición
    const barraProgreso = document.querySelector('.barra-progreso');
    barraProgreso.addEventListener('click', (e) => {
        const rect = barraProgreso.getBoundingClientRect();
        const porcentaje = (e.clientX - rect.left) / rect.width;
        const newTime = audio.duration * porcentaje;
        audio.currentTime = newTime;
    });
}

// Definir puntos de anclaje para mejorar la sincronización (timestamps optimizados para cada estrofa)
// Estos valores serán reemplazados por los del archivo LRC
let anchors = {
    0: 0,         // Inicio
    4: 11.5,      // "Ella era bella..."
    12: 34,       // "Todo marchaba bien..."
    23: 61,       // "Pero el tiempo pasa..."
    35: 94,       // "Este cuento no es eterno..."
    50: 127,      // "Hay tantas cicatrices..."
    64: 161,      // "Empiezan las discusiones..."
    80: 193,      // "Cada día más normal..."
    93: 223,      // "La Bella y la Bestia..." 
    100: 248,     // "Este cuento no es eterno..."
    115: 287,     // "Tu filo atravesó mi alma..."
    // Añadimos puntos de anclaje adicionales para secciones rápidas de rap
    125: 312,     // Sección rápida 1
    135: 333,     // Sección rápida 2
    145: 355      // Sección final
};

function sincronizarLetra() {
    const audio = document.getElementById('audioCancion');
    const contenedorLetra = document.getElementById('letra');
    
    // Función para encontrar la línea activa basada en los timestamps exactos del LRC
    function getActiveLineIndex(currentTime) {
        let activeIndex = 0;
        
        // Buscar la última línea cuyo timestamp sea menor o igual al tiempo actual
        for (const lineIndex in anchors) {
            const timestamp = anchors[lineIndex];
            if (timestamp <= currentTime) {
                activeIndex = Math.max(activeIndex, parseInt(lineIndex));
            }
        }
        
        return activeIndex;
    }
    
    // Limpiar intervalo previo si existe
    if (intervalLetra) {
        clearInterval(intervalLetra);
    }
    
    // Actualizar la línea activa cada 100ms para una mejor respuesta
    intervalLetra = setInterval(() => {
        if (audio.paused) return;
        
        // Obtener línea activa basada en el tiempo actual
        const currentTime = audio.currentTime;
        lineaActualIndex = getActiveLineIndex(currentTime);
        
        if (lineaActualIndex >= letraCancion.length) {
            lineaActualIndex = letraCancion.length - 1;
        }
        
        actualizarLineaActiva(lineaActualIndex);
    }, 100);
}

function actualizarLineaActiva(index) {
    // Obtenemos el contenedor de letra (con ID "letra")
    const letraContainer = document.getElementById('letra');
    // Obtenemos el CONTENEDOR QUE REALMENTE TIENE EL SCROLL (su padre)
    const scrollContainer = letraContainer.parentElement;
    
    const parrafos = letraContainer.querySelectorAll('p');
    
    // Quitar clase activa y aplicar transiciones adecuadas
    parrafos.forEach((p, i) => {
        p.classList.remove('activa');
        
        // Añadir clases para líneas cercanas (para un efecto visual más gradual)
        p.classList.remove('previa');
        p.classList.remove('siguiente');
        
        // La línea anterior tendrá un estilo "previa"
        if (i === index - 1) {
            p.classList.add('previa');
        }
        // La siguiente línea tendrá un estilo "siguiente"
        else if (i === index + 1) {
            p.classList.add('siguiente');
        }
    });
    
    // Añadir clase al párrafo actual
    if (index >= 0 && index < parrafos.length) {
        parrafos[index].classList.add('activa');
        
        // Auto scroll mejorado para seguir la letra
        // CAMBIO: Calculamos la posición relativa correctamente
        const offset = parrafos[index].offsetTop;
        
        // Ajuste para posicionar la línea activa un poco más arriba en el centro
        // para ver mejor las líneas que vienen a continuación
        const scrollTop = offset - (scrollContainer.clientHeight * 0.4);
        
        // En las secciones de rap rápido (mayor índice), hacer el scroll más suave pero rápido
        const behavior = index > 115 ? 'auto' : 'smooth';
        
        // CAMBIO: Aplicamos el scroll al CONTENEDOR correcto (el padre que tiene overflow-y:auto)
        scrollContainer.scrollTo({
            top: scrollTop,
            behavior: behavior
        });
        
        // Logging para debug (lo puedes quitar más adelante)
        console.log(`Auto-scroll aplicado: índice=${index}, offset=${offset}, scrollTop=${scrollTop}`);
    }
}

function mostrarBotonPasarJuego() {
    const btnPasarJuego = document.getElementById('btnPasarJuego');
    btnPasarJuego.classList.remove('oculto');
    
    const btnSaltarCancion = document.getElementById('btnSaltarCancion');
    btnSaltarCancion.classList.add('oculto');
}

// Función auxiliar para hacer debugging de errores en la carga de archivos
async function cargarArchivo(ruta) {
    try {
        console.log(`Intentando cargar archivo desde: ${ruta}`);
        const response = await fetch(ruta);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status} - ${response.statusText}`);
        }
        
        const texto = await response.text();
        console.log(`Archivo cargado correctamente. Tamaño: ${texto.length} caracteres`);
        return texto;
    } catch (error) {
        console.error(`Error al cargar archivo ${ruta}:`, error);
        throw error;
    }
}

// Versión mejorada de cargarPreguntas
async function cargarPreguntas() {
    try {
        // Intentar primero con la ruta assets/
        let texto;
        try {
            texto = await cargarArchivo('assets/Preguntas.txt');
        } catch (error) {
            console.warn("No se pudo cargar desde assets/, intentando desde raíz");
            texto = await cargarArchivo('Preguntas.txt');
        }
        
        // Dividir por líneas para procesar
        const lineas = texto.split('\n');
        console.log(`Líneas leídas: ${lineas.length}`);
        
        const literales = [];
        const inferenciales = [];
        const criticasCreativas = [];
        
        let preguntaActual = null;
        let opciones = [];
        let esLiteral = false;
        let esInferencial = false;
        let esCriticaCreativa = false;
        let esVerdaderoFalso = false;
        
        for (let i = 0; i < lineas.length; i++) {
            const linea = lineas[i].trim();
            
            // Detectar secciones
            if (linea === "Preguntas Literales") {
                esLiteral = true;
                esInferencial = false;
                esCriticaCreativa = false;
                console.log(`Línea ${i}: Sección de preguntas literales`);
                continue;
            } else if (linea === "Preguntas inferenciales:") {
                esLiteral = false;
                esInferencial = true;
                esCriticaCreativa = false;
                console.log(`Línea ${i}: Sección de preguntas inferenciales`);
                continue;
            } else if (linea === "Preguntas criticas/creativas:") {
                esLiteral = false;
                esInferencial = false;
                esCriticaCreativa = true;
                console.log(`Línea ${i}: Sección de preguntas críticas/creativas`);
                continue;
            }
            
            // Ignorar líneas vacías
            if (linea === "") continue;
            
            // Detectar inicio de pregunta numerada
            const preguntaMatch = linea.match(/^\d+\.\s(.+)$/);
            if (preguntaMatch) {
                // Si había una pregunta en proceso, guardarla
                if (preguntaActual && opciones.length > 0) {
                    const preguntaObj = {
                        pregunta: preguntaActual,
                        opciones: opciones,
                        esVerdaderoFalso: esVerdaderoFalso
                    };
                    
                    if (esLiteral) literales.push(preguntaObj);
                    else if (esInferencial) inferenciales.push(preguntaObj);
                    else if (esCriticaCreativa) criticasCreativas.push(preguntaObj);
                }
                
                // Iniciar nueva pregunta
                preguntaActual = preguntaMatch[1];
                opciones = [];
                esVerdaderoFalso = preguntaActual.includes("V/F");
                console.log(`Línea ${i}: Nueva pregunta: ${preguntaActual.substring(0, 30)}...`);
                continue;
            }
            
            // Procesar opciones de respuesta
            const opcionMatch = linea.match(/^([a-z]\))\s(.+)$/) || linea.match(/^(Verdadero|Falso)(\s\(correcta\)|\s*)$/);
            if (opcionMatch && preguntaActual) {
                const textoOpcion = opcionMatch[2] || opcionMatch[1];
                const esCorrecta = textoOpcion.includes("(correcta)");
                
                opciones.push({
                    texto: textoOpcion.replace(" (correcta)", ""),
                    correcta: esCorrecta
                });
                
                console.log(`Línea ${i}: Opción: ${textoOpcion.substring(0, 20)}... Correcta: ${esCorrecta}`);
            }
        }
        
        // No olvidar la última pregunta
        if (preguntaActual && opciones.length > 0) {
            const preguntaObj = {
                pregunta: preguntaActual,
                opciones: opciones,
                esVerdaderoFalso: esVerdaderoFalso
            };
            
            if (esLiteral) literales.push(preguntaObj);
            else if (esInferencial) inferenciales.push(preguntaObj);
            else if (esCriticaCreativa) criticasCreativas.push(preguntaObj);
        }
        
        console.log("Literales:", literales.length);
        console.log("Inferenciales:", inferenciales.length);
        console.log("Críticas/Creativas:", criticasCreativas.length);
        
        // Devolver las preguntas organizadas para que se puedan seleccionar después
        return {
            literales: literales,
            inferenciales: inferenciales,
            criticasCreativas: criticasCreativas
        };
        
    } catch (error) {
        console.error('Error al cargar preguntas:', error);
        alert("Error al cargar preguntas: " + error.message);
        return {
            literales: [],
            inferenciales: [],
            criticasCreativas: []
        };
    }
}

function seleccionarPreguntas(literales, inferenciales, criticasCreativas) {
    // Verificar que tenemos las preguntas necesarias
    if (!literales || literales.length === 0) {
        console.error("No hay preguntas literales disponibles");
        alert("Error: No se pudieron cargar las preguntas literales.");
        return [];
    }
    
    if (!inferenciales || inferenciales.length === 0) {
        console.error("No hay preguntas inferenciales disponibles");
        alert("Error: No se pudieron cargar las preguntas inferenciales.");
        return [];
    }
    
    if (!criticasCreativas || criticasCreativas.length === 0) {
        console.error("No hay preguntas críticas/creativas disponibles");
        alert("Error: No se pudieron cargar las preguntas críticas/creativas.");
        return [];
    }
    
    console.log(`Seleccionando preguntas de: ${literales.length} literales, ${inferenciales.length} inferenciales, ${criticasCreativas.length} críticas/creativas`);
    
    // Barajamos las preguntas
    const literalesBarajados = shuffle([...literales]);
    const inferencialesBarajados = shuffle([...inferenciales]);
    
    // Verificamos que tenemos suficientes preguntas crítico/creativas (deberían ser exactamente 3)
    if (criticasCreativas.length < 3) {
        console.warn(`Se esperaban 3 preguntas crítico/creativas, pero se encontraron ${criticasCreativas.length}`);
        console.warn("Se usarán todas las disponibles y se complementarán con más preguntas de otros tipos si es necesario");
    }
    
    // Seleccionamos las preguntas según los requisitos
    // Asegurarnos de no pedir más de las que hay disponibles
    const literalesSeleccionados = literalesBarajados.slice(0, Math.min(literalesBarajados.length, 3));
    const inferencialesSeleccionados = inferencialesBarajados.slice(0, Math.min(inferencialesBarajados.length, 3));
    
    // Asignamos el tipo a cada pregunta para controlar el tiempo
    literalesSeleccionados.forEach(pregunta => pregunta.tipo = 'literal');
    inferencialesSeleccionados.forEach(pregunta => pregunta.tipo = 'inferencial');
    criticasCreativas.forEach(pregunta => pregunta.tipo = 'criticaCreativa');
    
    // Incluimos todas las preguntas disponibles
    const todasPreguntas = [
        ...literalesSeleccionados,
        ...inferencialesSeleccionados,
        ...criticasCreativas
    ];
    
    console.log("Total preguntas seleccionadas:", todasPreguntas.length);
    
    return shuffle(todasPreguntas);
}

// Funciones para el juego
function iniciarQuiz() {
    preguntaActualIndex = 0;
    correctCount = 0;
    document.getElementById('nombreJugador').textContent = `Jugador: ${nombreJugador}`;
    
    // Verificar que tengamos preguntas
    if (!preguntasSeleccionadas || preguntasSeleccionadas.length === 0) {
        console.error("No hay preguntas seleccionadas para iniciar el quiz");
        alert("Error: No se pudieron cargar las preguntas.");
        return;
    }
    
    // Siempre mostramos 9 preguntas (3 literales, 3 inferenciales, 3 crítico/creativas)
    document.getElementById('totalPreguntas').textContent = 9;
    
    console.log("Iniciando quiz con", preguntasSeleccionadas.length, "preguntas");
    mostrarPreguntaActual();
}

function mostrarPreguntaActual() {
    console.log("Mostrando pregunta actual, índice:", preguntaActualIndex);
    
    if (!preguntasSeleccionadas || preguntasSeleccionadas.length === 0) {
        console.error("No hay preguntas para mostrar");
        return;
    }
    
    if (preguntaActualIndex >= preguntasSeleccionadas.length) {
        console.log("Se han terminado las preguntas, finalizando quiz");
        finalizarQuiz();
        return;
    }
    
    const pregunta = preguntasSeleccionadas[preguntaActualIndex];
    console.log("Mostrando pregunta:", pregunta);
    
    document.getElementById('preguntaActual').textContent = preguntaActualIndex + 1;
    document.getElementById('textoPregunta').textContent = pregunta.pregunta;
    
    // Mostrar tipo de pregunta
    const tipoPreguntaEl = document.getElementById('tipoPregunta');
    tipoPreguntaEl.className = 'tipo-pregunta';
    
    if (pregunta.tipo === 'literal') {
        tipoPreguntaEl.textContent = 'Literal - 30s';
        tipoPreguntaEl.classList.add('tipo-literal');
    } else if (pregunta.tipo === 'inferencial') {
        tipoPreguntaEl.textContent = 'Inferencial - 40s';
        tipoPreguntaEl.classList.add('tipo-inferencial');
    } else if (pregunta.tipo === 'criticaCreativa') {
        tipoPreguntaEl.textContent = 'Crítica/Creativa - 50s';
        tipoPreguntaEl.classList.add('tipo-criticaCreativa');
    }
    
    const opcionesContainer = document.getElementById('opcionesRespuesta');
    opcionesContainer.innerHTML = '';
    
    pregunta.opciones.forEach((opcion, index) => {
        const boton = document.createElement('button');
        boton.className = 'boton-opcion';
        
        // Para preguntas V/F no ponemos letra
        if (pregunta.esVerdaderoFalso) {
            boton.textContent = opcion.texto;
        } else {
            // Para preguntas normales, ponemos la letra correspondiente
            const letraOpcion = String.fromCharCode(97 + index) + ') ';
            boton.textContent = letraOpcion + opcion.texto;
        }
        
        boton.dataset.correcta = opcion.correcta;
        boton.addEventListener('click', (e) => seleccionarRespuesta(e.target));
        
        opcionesContainer.appendChild(boton);
    });
    
    // Iniciar temporizador
    iniciarTemporizador();
}

function iniciarTemporizador() {
    // Resetear temporizador si ya existe
    if (temporizador) {
        clearInterval(temporizador);
    }
      // Ahora todas las preguntas tienen 150 segundos de duración independientemente del tipo
    tiempoRestante = 150;
    
    const temporizadorEl = document.getElementById('temporizador');
    temporizadorEl.textContent = tiempoRestante;
    
    temporizador = setInterval(() => {
        tiempoRestante--;
        temporizadorEl.textContent = tiempoRestante;
        
        if (tiempoRestante <= 0) {
            clearInterval(temporizador);
            tiempoAgotado();
        }
    }, 1000);
}

function tiempoAgotado() {
    const botones = document.querySelectorAll('.boton-opcion');
    botones.forEach(boton => {
        boton.classList.add('desactivado');
        if (boton.dataset.correcta === 'true') {
            boton.classList.add('correcta');
        }
    });
    
    setTimeout(() => {
        preguntaActualIndex++;
        mostrarPreguntaActual();
    }, 1500);
}

function seleccionarRespuesta(botonSeleccionado) {
    // Detener el temporizador
    clearInterval(temporizador);
    
    // Desactivar todos los botones
    const botones = document.querySelectorAll('.boton-opcion');
    botones.forEach(boton => boton.classList.add('desactivado'));
    
    // Marcar respuesta correcta e incorrecta
    const esCorrecta = botonSeleccionado.dataset.correcta === 'true';
    
    if (esCorrecta) {
        botonSeleccionado.classList.add('correcta');
        correctCount++;
    } else {
        botonSeleccionado.classList.add('incorrecta');
        
        // Mostrar cuál era la correcta
        botones.forEach(boton => {
            if (boton.dataset.correcta === 'true') {
                boton.classList.add('correcta');
            }
        });
    }
    
    // Esperar un momento y pasar a la siguiente pregunta
    setTimeout(() => {
        preguntaActualIndex++;
        mostrarPreguntaActual();
    }, 1500);
}

function finalizarQuiz() {
    // Detener el temporizador
    if (temporizador) {
        clearInterval(temporizador);
        temporizador = null;
    }
    
    // Calcular puntuación
    const puntuacion = correctCount * 100;
    
    // Actualizar ranking local y en Firebase
    const localRanking = actualizarRanking(nombreJugador, puntuacion);
    
    // Mostrar resultados iniciales
    const contenedorResultados = document.querySelector('.contenedor-resultados');
    contenedorResultados.innerHTML = `
        <h2>Resultados</h2>
        <div class="resultado-principal">
            <p>¡Bien jugado, ${nombreJugador}!</p>
            <p>Has respondido correctamente ${correctCount} de ${preguntasSeleccionadas.length} preguntas</p>
            <p class="puntuacion">${puntuacion} puntos</p>
        </div>
        <div class="ranking">
            <h3>Ranking de Jugadores</h3>
            <p class="cargando">Cargando resultados en tiempo real...</p>
            <ul id="lista-ranking"></ul>
        </div>
        <div class="botones-finales">
            <button id="btnIntentarDeNuevo" class="boton-secundario">Intentar de nuevo</button>
            <button id="btnNuevoJugador" class="boton-secundario">Nuevo jugador</button>
            <button id="btnReiniciarJuego" class="boton-principal">Reiniciar juego</button>
        </div>
    `;
    
    // Suscribirse a cambios en tiempo real del ranking
    const sesionClaseId = obtenerSesionId();
    const rankingRef = firebase.database().ref('ranking').child(sesionClaseId);
    
    rankingRef.on('value', snapshot => {
        const listaRanking = document.getElementById('lista-ranking');
        const cargando = document.querySelector('.cargando');
        
        if (cargando) {
            cargando.remove();
        }
        
        if (snapshot.exists()) {
            // Convertir el snapshot a un array y ordenarlo
            const rankingData = Object.values(snapshot.val() || {});
            rankingData.sort((a, b) => b.puntuacion - a.puntuacion);
            
            listaRanking.innerHTML = rankingData.map((item, index) => {
                const posicionClass = index < 3 ? `top-${index+1}` : '';
                const jugadorActualClass = item.nombre === nombreJugador ? 'jugador-actual' : '';
                
                return `<li class="${posicionClass} ${jugadorActualClass}">
                    <span class="posicion">${index + 1}</span>
                    <span class="nombre-jugador">${item.nombre}</span>
                    <span class="puntuacion-jugador">${item.puntuacion} pts</span>
                </li>`;
            }).join('');
        } else {
            listaRanking.innerHTML = `<li>Sé el primero en completar el quiz</li>`;
        }
    });
    
    // Agregar event listeners a los botones finales
    // Nota: Los event listeners globales fueron eliminados para evitar duplicación
    // Estos son los únicos event listeners para estos botones
    document.getElementById('btnIntentarDeNuevo').addEventListener('click', function() {
        // Mantener el nombre del jugador actual pero reiniciar las preguntas
        correctCount = 0;
        preguntaActualIndex = 0;
        
        // Detener cualquier temporizador activo
        if (temporizador) {
            clearInterval(temporizador);
            temporizador = null;
        }
        
        // Cargar preguntas y pasar al quiz
        cargarPreguntas().then(preguntas => {
            // Seleccionar nuevas preguntas aleatorias con los arreglos correctos
            const todasPreguntas = seleccionarPreguntas(
                preguntas.literales || [],
                preguntas.inferenciales || [],
                preguntas.criticasCreativas || []
            );
            
            console.log("Nuevas preguntas seleccionadas para intentar de nuevo:", todasPreguntas);
            preguntasSeleccionadas = todasPreguntas;
            
            // Iniciar el quiz nuevamente sin pedir el nombre
            mostrarPantalla(pantalla4);
            mostrarPreguntaActual();
            iniciarTemporizador();
        }).catch(error => {
            console.error('Error al cargar preguntas para intentar de nuevo:', error);
            alert("Error al cargar las preguntas: " + error.message);
        });
    });
    
    document.getElementById('btnNuevoJugador').addEventListener('click', function() {
        // Volver a la pantalla de registro manteniendo los datos existentes
        nombreJugador = '';
        correctCount = 0;
        preguntaActualIndex = 0;
        mostrarPantalla(pantalla2);
    });
    
    document.getElementById('btnReiniciarJuego').addEventListener('click', function() {
        // Borrar solo el ranking local, no el de Firebase
        localStorage.removeItem('ranking');
        // Recargar la página para empezar desde cero
        location.reload();
    });
    
    // Mostrar la pantalla de resultados
    mostrarPantalla(pantalla5);
}

// Función para obtener o generar un ID de sesión
function obtenerSesionId() {
    // Buscar en la URL si hay un parámetro de sesión
    const urlParams = new URLSearchParams(window.location.search);
    let sesionId = urlParams.get('sesion');
    
    // Si no hay parámetro en la URL, usar la fecha actual
    if (!sesionId) {
        const ahora = new Date();
        sesionId = `clase-${ahora.getFullYear()}-${(ahora.getMonth()+1)
                                                 .toString().padStart(2,'0')}-${ahora.getDate()
                                                 .toString().padStart(2,'0')}`;
    }
    
    return sesionId;
}

// Funciones para el ranking
function actualizarRanking(nombre, puntuacion) {
    // Referencia a la base de datos
    const rankingRef = firebase.database().ref('ranking');
    
    // Generar un ID para la sesión de clase (usando la fecha)
    const sesionClaseId = obtenerSesionId();
    
    // Buscar si el jugador ya existe en el ranking
    rankingRef.child(sesionClaseId).once('value', snapshot => {
        let existingRanking = [];
        if (snapshot.exists()) {
            existingRanking = Object.values(snapshot.val() || {});
        }
        
        // Buscar jugador existente por nombre
        const jugadorExistente = existingRanking.find(item => item.nombre === nombre);
        
        if (jugadorExistente) {
            // Si ya existe, actualizar solo si la puntuación es mejor
            if (puntuacion > jugadorExistente.puntuacion) {
                // Actualizar en Firebase
                rankingRef.child(sesionClaseId)
                          .child(jugadorExistente.id)
                          .update({ puntuacion: puntuacion });
            }
        } else {
            // Si no existe, crear nuevo jugador
            const newPlayerId = rankingRef.child(sesionClaseId).push().key;
            rankingRef.child(sesionClaseId)
                      .child(newPlayerId)
                      .set({ 
                          id: newPlayerId,
                          nombre: nombre, 
                          puntuacion: puntuacion,
                          timestamp: Date.now() 
                      });
        }
    });
    
    // También guardar localmente para respaldo
    let localRanking = JSON.parse(localStorage.getItem('ranking')) || [];
    const localIndex = localRanking.findIndex(item => item.nombre === nombre);
    
    if (localIndex !== -1) {
        if (puntuacion > localRanking[localIndex].puntuacion) {
            localRanking[localIndex].puntuacion = puntuacion;
        }
    } else {
        localRanking.push({ nombre, puntuacion });
    }
      localRanking.sort((a, b) => b.puntuacion - a.puntuacion);
    localStorage.setItem('ranking', JSON.stringify(localRanking));
    
    return localRanking;
}

function mostrarRanking() {
    const ranking = JSON.parse(localStorage.getItem('ranking')) || [];
    const cuerpoTabla = document.getElementById('cuerpoTablaRanking');
    cuerpoTabla.innerHTML = '';
    
    // Mostrar máximo 3 jugadores
    const top3 = ranking.slice(0, 3);
    
    top3.forEach((jugador, index) => {
        const fila = document.createElement('tr');
        
        const celdaPosicion = document.createElement('td');
        celdaPosicion.textContent = index + 1;
        
        const celdaNombre = document.createElement('td');
        celdaNombre.textContent = jugador.name;
        
        const celdaPuntuacion = document.createElement('td');
        celdaPuntuacion.textContent = jugador.score;
        
        fila.appendChild(celdaPosicion);
        fila.appendChild(celdaNombre);
        fila.appendChild(celdaPuntuacion);
        
        cuerpoTabla.appendChild(fila);
    });
}

// Función para cargar duración del audio de manera proactiva
function precargarDuracionAudio() {
    const audio = document.getElementById('audioCancion');
    const duracionTotal = document.getElementById('duracionTotal');
    
    // Precargar el audio para tener la duración lista
    audio.preload = 'metadata';
    
    // Establecer manejador para cuando los metadatos estén disponibles
    audio.addEventListener('loadedmetadata', () => {
        duracionTotal.textContent = formatearTiempo(audio.duration);
        console.log('Duración cargada:', formatearTiempo(audio.duration));
    });
}

// Event Listeners e Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    // Precargar duración del audio
    precargarDuracionAudio();
    
    // Pantalla 1: Botón empezar
    document.getElementById('btnEmpezar').addEventListener('click', () => {
        mostrarPantalla(pantalla2);
    });
    
    // Pantalla 2: Validación y continuación
    document.getElementById('btnContinuar').addEventListener('click', () => {
        const inputNombre = document.getElementById('inputNombre');
        const errorNombre = document.getElementById('errorNombre');
        const nombre = inputNombre.value.trim();
        
        if (!nombre) {
            errorNombre.textContent = 'Por favor, ingrese su nombre.';
            errorNombre.classList.remove('oculto');
            return;
        }
        
        if (nombre.length > 15) {
            errorNombre.textContent = 'El nombre no puede tener más de 15 caracteres.';
            errorNombre.classList.remove('oculto');
            return;
        }
        
        if (!/^[A-Za-z0-9]+$/.test(nombre)) {
            errorNombre.textContent = 'Solo se permiten letras y números.';
            errorNombre.classList.remove('oculto');
            return;
        }
        
        // Guardar nombre y continuar
        nombreJugador = nombre;
        errorNombre.classList.add('oculto');
        mostrarPantalla(pantalla3);
        
        // Cargar letra y preparar el audio
        cargarLetra().then(() => {
            // Iniciar reproducción tras interacción del usuario
            iniciarReproduccion();
        });
    });
    
    // Control del reproductor
    document.getElementById('btnPlayPause').addEventListener('click', () => {
        const audio = document.getElementById('audioCancion');
        const iconoPlay = document.getElementById('iconoPlay');
        const iconoPause = document.getElementById('iconoPause');
        
        if (audio.paused) {
            iniciarReproduccion(); // Usamos la función completa que maneja la sincronización
        } else {
            audio.pause();
            iconoPlay.classList.remove('oculto');
            iconoPause.classList.add('oculto');
        }
    });
      // Botones de navegación en pantalla 3
    document.getElementById('btnSaltarCancion').addEventListener('click', () => {
        document.getElementById('audioCancion').pause();
        clearInterval(intervalLetra);
        
        console.log("Cargando preguntas...");
        
        // Cargar preguntas y pasar al quiz
        cargarPreguntas().then(preguntas => {
            console.log("Preguntas cargadas:", preguntas);
            
            if (!preguntas || (!preguntas.literales && !preguntas.inferenciales && !preguntas.criticasCreativas)) {
                console.error("Error: No se cargaron preguntas correctamente");
                alert("Error al cargar las preguntas. Revisa la consola para más detalles.");
                return;
            }
            
            const todasPreguntas = seleccionarPreguntas(
                preguntas.literales || [],
                preguntas.inferenciales || [],
                preguntas.criticasCreativas || []
            );
            
            console.log("Preguntas seleccionadas:", todasPreguntas);
            preguntasSeleccionadas = todasPreguntas;
            mostrarPantalla(pantalla4);
            iniciarQuiz();
        }).catch(error => {
            console.error('Error al cargar preguntas:', error);
            alert("Error al cargar las preguntas: " + error.message);
        });
    });
      document.getElementById('btnPasarJuego').addEventListener('click', () => {
        document.getElementById('audioCancion').pause();
        clearInterval(intervalLetra);
        
        console.log("Pasando al juego...");
        
        // Cargar preguntas y pasar al quiz
        cargarPreguntas().then(preguntas => {
            console.log("Preguntas cargadas para juego:", preguntas);
            
            if (!preguntas || (!preguntas.literales && !preguntas.inferenciales && !preguntas.criticasCreativas)) {
                console.error("Error: No se cargaron preguntas correctamente");
                alert("Error al cargar las preguntas. Revisa la consola para más detalles.");
                return;
            }
            
            const todasPreguntas = seleccionarPreguntas(
                preguntas.literales || [],
                preguntas.inferenciales || [],
                preguntas.criticasCreativas || []
            );
            
            console.log("Preguntas seleccionadas para juego:", todasPreguntas);
            preguntasSeleccionadas = todasPreguntas;
            mostrarPantalla(pantalla4);
            iniciarQuiz();
        }).catch(error => {
            console.error('Error al cargar preguntas:', error);
            alert("Error al cargar las preguntas: " + error.message);
        });
    });
    
    // Eliminamos los event listeners globales para los botones finales
    // Ya que estos serán agregados dinámicamente en finalizarQuiz()
    // document.getElementById('btnReiniciarJuego').addEventListener('click', function() {...});
    // document.getElementById('btnNuevoJugador').addEventListener('click', function() {...});
    // document.getElementById('btnIntentarDeNuevo').addEventListener('click', function() {...});
    
    // Precargar duración del audio al cargar la página
    precargarDuracionAudio();
});
