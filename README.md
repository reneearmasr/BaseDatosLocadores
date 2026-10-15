# BaseDatosLocadores

Gestor de Locadores de la ATU: aplicativo web para consultar, actualizar, cruzar con Excel y consolidar la base de datos de locadores, con control de techos por área usuaria.

## Cómo funciona

- **Aplicativo:** Google Apps Script (carpeta `apps-script/`), publicado como aplicación web.
- **Repositorio de datos:** una hoja de Google Sheets con las pestañas `BASE`, `HISTORIAL`, `BAJAS` y `TECHOS`. Los datos **no** se guardan en este repositorio de GitHub.
- **Página de acceso:** `index.html` (GitHub Pages) abre el aplicativo dentro de la página. Si el navegador bloquea la vista integrada, usar el botón **"Abrir en pestaña completa"**.

## Asistente de locadores (chatbot)

Botón flotante **"Pregúntale a la base"** (abajo a la derecha), con el mismo diseño y funcionamiento que el asistente del Tablero ATU. Responde con los datos de la base, sin inteligencia artificial ni servicios externos (nada sale de Google).

Ejemplos de preguntas:

- "Resumen de la base", "¿Cuántos locadores tiene la GAF?", "¿y cuánto suman?"
- "¿Qué áreas exceden su techo?", "Techo de la Unidad de Presupuesto", "¿Alcanza para contratar uno de 5 mil en la GTU?"
- "Locadores por órgano", "¿Qué unidad tiene más locadores?", "Monto mensual por unidad orgánica"
- "Los 10 honorarios más altos", "Locadores de campo con más de 5000", "Coordinadores con maestría"
- "Datos de Rosa Quispe", un DNI, "Cambios de 40000274", "Últimos cambios de hoy"
- "Problemas de calidad de datos", "¿Cómo registro un nuevo locador?"

Se puede mover con el mouse: arrastra el botón del robot o la barra superior del chat; recuerda dónde lo dejaste (doble clic en la barra lo devuelve a su lugar). Las respuestas permiten abrir la ficha del locador, verlo en la Base de datos o exportar a Excel. Si hay áreas que exceden su techo, el botón muestra un aviso.

El código fuente del asistente está en `src/asistente.js`; ya va incluido dentro de `apps-script/Index.html`, así que para publicarlo solo se copian `Codigo.gs` e `Index.html`.

## Acceso

Solo pueden usarlo las personas con la hoja de Google compartida como **Editor**. Cada cambio queda registrado con el correo de quien lo hizo.

## Actualizar el aplicativo

1. Copiar `apps-script/Codigo.gs` e `apps-script/Index.html` en el proyecto de Apps Script de la hoja.
2. Implementar → Gestionar implementaciones → editar → **Nueva versión** → Implementar.

La dirección `/exec` no cambia, por lo que esta página sigue funcionando.
