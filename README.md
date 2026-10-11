# Práctica guiada — Módulos de nginx: procesado de imágenes con `image_filter`

Repositorio para la práctica de administración y seguridad de servidores web utilizando Nginx en un contenedor Docker (`dpl-lab`), implementando HTTPS, autenticación básica, procesamiento de imágenes en el servidor y análisis de registros.

---

## 1. Instalación

Módulo `libnginx-mod-http-image-filter`, `ImageMagick` y `goaccess` dentro de `dpl-lab`; activación del módulo y comprobación con `nginx -V` / `nginx -T`.

La configuración y despliegue del servidor se realizan dentro de un contenedor Docker basado en Ubuntu (`dpl-lab`). Los componentes principales instalados y configurados son:

* **Módulo Dinámico `libnginx-mod-http-image-filter`**: Instalado para permitir el redimensionamiento, escalado y rotación de imágenes directamente en el servidor web Nginx mediante parámetros en la URL.
* **ImageMagick**: Utilizado para la creación y manipulación local de las imágenes originales en el entorno de desarrollo.
* **GoAccess**: Herramienta instalada para el análisis en tiempo real y la generación de informes estadísticos (formato JSON) a partir de los registros de acceso de Nginx.

* Para instalar el módulo `libnginx-mod-http-image-filter` ejecuta los siguientes comandos:

```bash
docker exec dpl-lab apt-get update
docker exec dpl-lab apt-get install -y libnginx-mod-http-image-filter
docker exec dpl-lab ls /etc/nginx/modules-enabled/          # 50-mod-http-image-filter.conf
docker exec dpl-lab grep -R "load_module" /etc/nginx/modules-enabled/   # -R sigue el enlace simbólico; -r no lo muestra
docker exec dpl-lab nginx -t                                # syntax is ok
```

### Verificación del Entorno
* **Comprobación de módulos activos**: Se verifica la correcta carga del módulo mediante la directiva `load_module` en el directorio de configuración (`/etc/nginx/modules-enabled/50-mod-http-image-filter.conf`).

* **Validación de sintaxis y configuración**: 
  - `nginx -t` para comprobar la sintaxis global de los archivos de configuración.
  - `nginx -T` para volcar la configuración completa de los bloques de servidor (*Server Blocks*).
  - `nginx -V` para revisar los módulos compilados y los argumentos de configuración del binario.

---

## 2. Generar las imágenes de prueba con ImageMagick

* Comando con ImageMagick: Para crear el conjunto de pruebas inicial de la galería de forma automatizada, se ejecutó el siguiente bucle dentro del contenedor:

```bash
docker exec dpl-lab apt-get install -y imagemagick
docker exec dpl-lab mkdir -p /var/www/images.alumno.local/img
docker exec dpl-lab bash -c 'for i in $(seq -w 1 20); do \
  convert -size 400x400 gradient:"#2f6fed"-"#8bc34a" \
    -fill white -pointsize 64 -gravity center -annotate 0 "IMG $i" \
    /var/www/images.alumno.local/img/image$i.jpg; done'
docker exec dpl-lab identify /var/www/images.alumno.local/img/image01.jpg   # 400x400
```

* Por qué no se versionan: Los archivos binarios de imagen incrementan innecesariamente el peso del repositorio y ralentizan las operaciones de control de versiones. Al ser recursos generados dinámicamente (assets), se excluyen mediante el archivo .gitignore y se regeneran localmente en cada entorno de despliegue.

---

### Crear la aplicación de la galería

Se crean los archivos `index.html`, `app.js` y `estilos.css` en `/var/www/images.alumno.local/`.

`web/index.html`:

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Galeria images.alumno.local</title>
    <link rel="stylesheet" href="estilos.css">
</head>
<body>
    <h1>Galeria de prueba</h1>
    <form id="controles">
        <label>Tamaño
            <select id="size">
                <option value="150">150</option>
                <option value="300" selected>300</option>
                <option value="600">600</option>
            </select>
        </label>
        <label>Ancho de borde
            <input type="range" id="border" min="0" max="12" value="2">
        </label>
        <label>Color del borde
            <input type="color" id="borderColor" value="#333333">
        </label>
        <label>Enfoque
            <select id="sharpen">
                <option value="0" selected>0</option>
                <option value="30">30</option>
                <option value="60">60</option>
                <option value="100">100</option>
            </select>
        </label>
        <label>Desenfoque
            <input type="range" id="blur" min="0" max="8" value="0">
        </label>
        <button type="submit">Generar</button>
    </form>
    <div class="galeria" id="galeria"></div>
    <script src="app.js"></script>
</body>
</html>
```

```js
web/app.js:


const TOTAL = 20;

// El tamaño y el enfoque los procesa image_filter en el servidor: viajan en la URL.
function urlImagen(numero, size, sharpen) {
  const id = String(numero).padStart(2, "0");
  return `/img/image${id}.jpg?size=${size}&sharpen=${sharpen}`;
}

// Las 20 miniaturas se crean una sola vez.
function crearGaleria() {
  const contenedor = document.getElementById("galeria");
  for (let i = 1; i <= TOTAL; i++) {
    const img = document.createElement("img");
    img.alt = `Imagen ${i}`;
    contenedor.appendChild(img);
  }
}

// Borde, color y desenfoque son efectos de presentacion: los aplica el cliente.
function aplicarEfectos(borde, color, desenfoque) {
  document.querySelectorAll("#galeria img").forEach((img) => {
    img.style.borderStyle = "solid";
    img.style.borderWidth = `${borde}px`;
    img.style.borderColor = color;
    img.style.filter = desenfoque > 0 ? `blur(${desenfoque}px)` : "none";
  });
}

function render() {
  const size = document.getElementById("size").value;
  const sharpen = document.getElementById("sharpen").value;
  const borde = document.getElementById("border").value;
  const color = document.getElementById("borderColor").value;
  const desenfoque = document.getElementById("blur").value;

  document.querySelectorAll("#galeria img").forEach((img, indice) => {
    img.src = urlImagen(indice + 1, size, sharpen);
  });
  aplicarEfectos(borde, color, desenfoque);
}

document.addEventListener("DOMContentLoaded", () => {
  crearGaleria();
  document.getElementById("controles").addEventListener("submit", (evento) => {
    evento.preventDefault();
    render();
  });
  render();   // primer render con los valores por defecto
});
```

`web/estilos.css`:

```css
body {
    font-family: system-ui, sans-serif;
    margin: 2rem;
}

#controles {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: end;
    margin-bottom: 1.5rem;
}

#controles label {
    display: flex;
    flex-direction: column;
    font-size: 0.85rem;
}

.galeria {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
}

.galeria img {
    display: block;
}
```
El comando `chmod -R a+rX` concede permisos de lectura (r) y de búsqueda/ejecución en directorios (X) a todos los usuarios (a) de forma recursiva (-R) sobre la ruta `/var/www/images.alumno.local`.

```bash
docker exec dpl-lab chmod -R a+rX /var/www/images.alumno.local
```

## Generar el certificado autofirmado con SAN (Subject Alternative Name)

Ejecuta los sigueintes comandos para generar el certificado autofirmado, primero crea el directorio donde se alojarán `/etc/ssl/dpl/`, ejecta el comando de generación del certificado y cambia los permisos a solo lectura para el usuario `root`.

```bash
docker exec dpl-lab mkdir -p /etc/ssl/dpl
docker exec dpl-lab openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
     -keyout /etc/ssl/dpl/images.alumno.local.key \
     -out /etc/ssl/dpl/images.alumno.local.crt \
     -subj "/CN=images.alumno.local" \
     -addext "subjectAltName=DNS:images.alumno.local,DNS:www.images.alumno.local"
docker exec dpl-lab chmod 400 /etc/ssl/dpl/images.alumno.local.key
```

*Nota: Para copiar un archivo desde el contenedor Docker a PC Anfitrión ejecuta el domando `docker cp nombre_contenedor:/ruta_archivo ruta_directorio_pc_anfitrion`*

## Crear el usuario de la galería

Ejecuta los siguientes comandos para crear y escribir el usuario y contraseña cifrada, cambiar la propiedad del archivo al usuario `root`y al grupo `www-data` y cambiar los permisos a `640`, lo que significa que el usuario `root` puede leer y escribir, el grupo `www-data` solo puede leerlo, y el resto de usuarios del sistema no tienen ningún acceso.

```bash
docker exec dpl-lab bash -c 'echo "alumno:$(openssl passwd -apr1 CAMBIAR_ESTO)" > /etc/nginx/htpasswd-images'
docker exec dpl-lab chown root:www-data /etc/nginx/htpasswd-images
docker exec dpl-lab chmod 640 /etc/nginx/htpasswd-images
```

## Activar, validar y recargar

```bash
docker exec dpl-lab ln -s /etc/nginx/sites-available/010-images.alumno.local /etc/nginx/sites-enabled/
docker exec dpl-lab nginx -t          # syntax is ok
docker exec dpl-lab nginx -s reload
docker exec dpl-lab nginx -T | grep -E "server_name images|image_filter|load_module" | head
```
El orden profesional: activar → validar → aplicar. nginx -T confirma que el módulo está cargado y el filtro está donde debe.

**Resultado esperado**: syntax is ok; en nginx -T aparecen load_module ... image_filter ..., la directiva image_filter y los server_name.

## Comprobar con curl

```bash
# La página pública responde
docker exec dpl-lab curl -k -I https://localhost/ -H "Host: images.alumno.local"          # 200

# /img está protegido: 401 sin credenciales
docker exec dpl-lab curl -k -I "https://localhost/img/image01.jpg" -H "Host: images.alumno.local"   # 401

# Imagen sin ampliar: size=600 (mayor que el original) devuelve 400x400
docker exec dpl-lab curl -k -u alumno:CAMBIAR_ESTO -o /tmp/original.jpg \
    "https://localhost/img/image01.jpg?size=600" -H "Host: images.alumno.local"
docker exec dpl-lab identify /tmp/original.jpg        # 400x400 (no se amplia)

# Miniatura generada por image_filter (150x150, con mas enfoque)
docker exec dpl-lab curl -k -u alumno:CAMBIAR_ESTO -o /tmp/mini.jpg \
    "https://localhost/img/image01.jpg?size=150&q=60&sharpen=30" -H "Host: images.alumno.local"
docker exec dpl-lab identify /tmp/mini.jpg            # 150x150

# Redirecciones
docker exec dpl-lab curl -I http://localhost/ -H "Host: images.alumno.local"          # 301 -> https
docker exec dpl-lab curl -I http://localhost/ -H "Host: www.images.alumno.local"      # 301 -> images.alumno.local

# Certificado
docker exec dpl-lab openssl s_client -connect localhost:443 -servername images.alumno.local 2>&1 | grep -E "subject=|issuer="
```

## Analizar el log con goaccess

```bash
docker exec dpl-lab apt-get install -y goaccess
docker exec dpl-lab goaccess /var/log/nginx/images-alumno.access.log \
    --log-format=COMBINED -o /home/alumno/dpl/informe-images.json
docker exec dpl-lab goaccess /var/log/nginx/images-alumno.access.log \
    --log-format=COMBINED -o /home/alumno/dpl/informe-images.html
docker exec dpl-lab tail -n 10 /var/log/nginx/images-alumno.access.log
```

