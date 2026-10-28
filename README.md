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

## Meses financiados y previsión presupuestal

- **Meses financiados** (= con certificado): 12 columnas al final de la hoja (`FINANCIADO ENE` … `FINANCIADO DIC`), marcadas con X. En la ficha se marcan con un clic (botones "Todo el año", "Del mes actual a DIC", "Según Certificado"). La edición masiva permite marcar, quitar o reemplazar meses, o tomarlos de la columna Certificado.
- **Llenado inicial**: en Calidad de datos → "Sin meses financiados registrados" → **Completar desde la columna "Certificado"** (lee textos como `SI (AGO-DIC)`, `SI (OCT - NOV)`, `SI (Set)`). Los "SI" sin meses se marcan a mano.
- **Previsión presupuestal** (años siguientes): `PREVISIÓN PRESUPUESTAL` (SI / NO / EN TRÁMITE), `N° PREVISIÓN`, `MONTO PREVISTO`, `AÑOS DE LA PREVISIÓN`.
- La app calcula el monto financiado en el año, los meses pendientes de certificar (del mes actual a diciembre) y su costo, con filtros, alertas, KPIs en el Panel y la tabla "Financiamiento y previsión presupuestal por área" en Consolidados (exportable a Excel).
- Al crear un año nuevo se puede empezar sin meses financiados.

## Situación del locador (Pasó a CAS, concluido…)
- Columnas nuevas al final de la hoja: **SITUACIÓN**, **FECHA DE SITUACIÓN**, **SUSTENTO DE SITUACIÓN** y **TIPO DE DOCUMENTO** (DNI, CE, PASAPORTE, PTP).
- Vacío o ACTIVO = suma a la PEA. Cualquier otra situación (PASÓ A CAS, CONCLUIDO, RESOLUCIÓN DE CONTRATO, RENUNCIA) mantiene el registro en la base, pero **no suma** a la PEA, montos, techos, consolidados, Resumen locadores, calidad de datos ni al asistente.
- **Cruce con Excel → "Marcar coincidencias como…"**: registra la situación en los locadores encontrados; la fecha y el sustento pueden tomarse de columnas del archivo (p. ej. FECHA DE FIRMA y CAS). Incluye los casos "Nombre coincide, DNI distinto" (p. ej. Carné de Extranjería) y opcionalmente reemplaza el documento por el del archivo.
- Panel general: cuántos no activos hay y el **certificado que se libera** (meses financiados posteriores a la fecha de la situación), con exportación a Excel.
- Base de datos: filtro "Situación" y etiqueta en el nombre. Al crear un año nuevo se puede no copiar a los no activos.
- Los documentos con tipo distinto de DNI no se marcan como "DNI con longitud distinta de 8 dígitos".

## Multianual

- Cada año tiene sus propias hojas en el repositorio: `BASE 2026`, `TECHOS 2026`, `BASE 2027`, `TECHOS 2027`… El `HISTORIAL` y las `BAJAS` son comunes y llevan la columna `AÑO`.
- En el menú lateral, **Año de trabajo** permite cambiar de año; la app recuerda el último año elegido. Todo (base, techos, consolidados, resumen, calidad, historial, asistente) trabaja sobre el año elegido.
- **＋ Año** crea un año nuevo copiando la base y los techos del año que se elija. Opcionalmente el monto mensual actual pasa a la columna "monto anterior" del año nuevo. El año copiado queda intacto y se puede seguir editando.
- **Comparar versiones y años**: elige otro año para ver altas, bajas y cambios entre años.
- La primera vez que se abre esta versión, las hojas `BASE` y `TECHOS` existentes se renombran a `BASE 2026` y `TECHOS 2026` sin perder datos.

## Numeración (N°)

- Botón **"Numerar del 1 al …"** en Base de datos (aparece cuando hay registros sin N° o con N° repetido). También en Calidad de datos y en el menú de la hoja: **Gestor de Locadores → Renumerar N° de orden**.
- Cada locador nuevo recibe automáticamente el número siguiente al último registrado.

## Acceso

Solo pueden usarlo las personas con la hoja de Google compartida como **Editor**. Cada cambio queda registrado con el correo de quien lo hizo.

## Actualizar el aplicativo

1. Copiar `apps-script/Codigo.gs` e `apps-script/Index.html` en el proyecto de Apps Script de la hoja.
2. Implementar → Gestionar implementaciones → editar → **Nueva versión** → Implementar.

La dirección `/exec` no cambia, por lo que esta página sigue funcionando.
