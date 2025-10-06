document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN DEL JUEGO ---
    // Aquí puedes añadir fácilmente más rondas de juego.
    // Cada objeto define una ronda con el sonido objetivo, las opciones de letras,
    // la respuesta correcta y la palabra clave para el refuerzo.
    const rondas = [
        {
            sonido: 'm',
            opciones: ['m', 's', 'p'],
            correcta: 'm',
            palabraClave: 'mama'
        },
        {
            sonido: 'a',
            opciones: ['a', 'e', 'o'],
            correcta: 'a',
            palabraClave: 'avion' // Reemplazar con una imagen real
        },
        {
            sonido: 's',
            opciones: ['p', 's', 'a'],
            correcta: 's',
            palabraClave: 'sol'
        }
    ];

    // --- VARIABLES DE ESTADO ---
    let rondaActual = 0;
    let intentosFallidos = 0;
    let juegoBloqueado = false; // Para evitar múltiples clics

    // --- ELEMENTOS DEL DOM ---
    const instruccionEl = document.getElementById('instruccion');
    const cartasContainerEl = document.getElementById('cartas-container');
    const feedbackImagenEl = document.getElementById('feedback-imagen');
    const feedbackTextoEl = document.getElementById('feedback-texto');

    // --- FUNCIONES DEL JUEGO ---

    /**
     * Inicia una nueva ronda o termina el juego.
     */
    function iniciarRonda() {
        if (rondaActual >= rondas.length) {
            finalizarJuego();
            return;
        }

        // Reseteo de estado
        juegoBloqueado = false;
        intentosFallidos = 0;
        const dataRonda = rondas[rondaActual];

        // Limpiar UI
        cartasContainerEl.innerHTML = '';
        feedbackImagenEl.style.visibility = 'hidden';
        feedbackTextoEl.textContent = '';

        // Actualizar instrucción y reproducir sonido [cite: 22, 29]
        instruccionEl.textContent = `Toca la letra que suena /${dataRonda.sonido}/`;
        reproducirSonido(`fonema_${dataRonda.sonido}`);

        // Crear las cartas [cite: 23]
        dataRonda.opciones.forEach(letra => {
            const carta = document.createElement('div');
            carta.classList.add('carta');
            carta.dataset.letra = letra;
            
            const imagenLetra = document.createElement('img');
            imagenLetra.src = `media/imagenes/letra_${letra}.png`;
            imagenLetra.alt = `Letra ${letra}`;
            carta.appendChild(imagenLetra);

            carta.addEventListener('click', manejarSeleccion);
            cartasContainerEl.appendChild(carta);
        });
    }

    /**
     * Maneja la selección de una carta por parte del niño.
     * Implementa la lógica de acierto y error del reporte. [cite: 25, 27]
     */
    function manejarSeleccion(evento) {
        if (juegoBloqueado) return;
        juegoBloqueado = true;

        const cartaSeleccionada = evento.currentTarget;
        const letraSeleccionada = cartaSeleccionada.dataset.letra;
        const letraCorrecta = rondas[rondaActual].correcta;

        if (letraSeleccionada === letraCorrecta) {
            manejarAcierto(cartaSeleccionada);
        } else {
            intentosFallidos++;
            manejarError(cartaSeleccionada);
        }
    }

    /**
     * Lógica para cuando el niño acierta. [cite: 25, 38]
     */
    function manejarAcierto(carta) {
        const dataRonda = rondas[rondaActual];
        
        carta.classList.add('correcta');
        reproducirSonido('exito');

        // Muestra refuerzo visual y textual
        feedbackImagenEl.src = "media/imagenes/refuerzo.png"; // Siempre la misma imagen
        feedbackImagenEl.style.visibility = 'visible';
        feedbackTextoEl.textContent = `¡Muy bien!`;

        // Reproduce el refuerzo auditivo completo
        reproducirSonido(`refuerzo_${dataRonda.correcta}`);

        // Pasa a la siguiente ronda después de una pausa
        setTimeout(() => {
            rondaActual++;
            iniciarRonda();
        }, 3000); // 3 segundos de pausa para ver el refuerzo
    }

    /**
     * Lógica para cuando el niño falla. Implementa el andamiaje progresivo. [cite: 39-43]
     */
    function manejarError(carta) {
        carta.classList.add('incorrecta');
        const dataRonda = rondas[rondaActual];

        switch (intentosFallidos) {
            case 1: // Primer fallo
                feedbackTextoEl.textContent = 'Casi. Escucha otra vez...';
                reproducirSonido('error_casi');
                setTimeout(() => {
                    carta.classList.remove('incorrecta');
                    reproducirSonido(`fonema_${dataRonda.sonido}`);
                    juegoBloqueado = false; // Desbloquea para un nuevo intento
                }, 1500);
                break;
            
            case 2: // Segundo fallo
                feedbackTextoEl.textContent = 'Intenta con una de estas dos.';
                reproducirSonido('error_prueba_dos');
                // Desactiva la carta incorrecta que se acaba de tocar [cite: 41]
                carta.classList.add('desactivada');
                carta.removeEventListener('click', manejarSeleccion);
                juegoBloqueado = false;
                break;
                
            case 3: // Tercer fallo
                // Modela la respuesta correcta
                feedbackTextoEl.textContent = `Esta es la '${dataRonda.correcta}'. Toca la '${dataRonda.correcta}'.`;
                reproducirSonido(`error_modelo_${dataRonda.correcta}`); // Necesitarías audios como "error_modelo_m.mp3"
                
                // Desactiva todas las cartas incorrectas y resalta la correcta [cite: 42]
                document.querySelectorAll('.carta').forEach(c => {
                    if (c.dataset.letra !== dataRonda.correcta) {
                        c.classList.add('desactivada');
                        c.removeEventListener('click', manejarSeleccion);
                    } else {
                        c.classList.add('resaltada');
                    }
                });
                juegoBloqueado = false; // Permite al niño tocar la carta correcta para avanzar
                break;
        }
    }

    function finalizarJuego() {
        instruccionEl.textContent = '¡Juego terminado!';
        cartasContainerEl.innerHTML = '<p style="font-size: 1.5rem;">¡Lo hiciste muy bien!</p>';
        feedbackTextoEl.textContent = '¡Sigue practicando!';
    }
    
    /**
     * Utilidad para reproducir un archivo de sonido.
     */
    function reproducirSonido(nombre) {
        const audio = new Audio(`media/sonidos/${nombre}.mp3`);
        audio.play();
    }

    // --- INICIO DEL JUEGO ---
    iniciarRonda();
});