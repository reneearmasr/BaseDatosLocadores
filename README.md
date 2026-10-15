# BaseDatosLocadores

Gestor de Locadores de la ATU: aplicativo web para consultar, actualizar, cruzar con Excel y consolidar la base de datos de locadores, con control de techos por área usuaria.

## Cómo funciona

- **Aplicativo:** Google Apps Script (carpeta `apps-script/`), publicado como aplicación web.
- **Repositorio de datos:** una hoja de Google Sheets con las pestañas `BASE`, `HISTORIAL`, `BAJAS` y `TECHOS`. Los datos **no** se guardan en este repositorio de GitHub.
- **Página de acceso:** `index.html` (GitHub Pages) abre el aplicativo dentro de la página. Si el navegador bloquea la vista integrada, usar el botón **"Abrir en pestaña completa"**.

## Acceso

Solo pueden usarlo las personas con la hoja de Google compartida como **Editor**. Cada cambio queda registrado con el correo de quien lo hizo.

## Actualizar el aplicativo

1. Copiar `apps-script/Codigo.gs` e `apps-script/Index.html` en el proyecto de Apps Script de la hoja.
2. Implementar → Gestionar implementaciones → editar → **Nueva versión** → Implementar.

La dirección `/exec` no cambia, por lo que esta página sigue funcionando.
