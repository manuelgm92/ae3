# Certificado autofirmado

El fichero `images.alumno.local.crt` es el certificado PUBLICO del sitio.
La clave privada (`images.alumno.local.key`) NO se versiona nunca.

Generacion (dentro de dpl-lab):

    mkdir -p /etc/ssl/dpl
    openssl req -x509 -nodes -newkey rsa:2048 -days 365 \
         -keyout /etc/ssl/dpl/images.alumno.local.key \
         -out /etc/ssl/dpl/images.alumno.local.crt \
         -subj "/CN=images.alumno.local" \
         -addext "subjectAltName=DNS:images.alumno.local,DNS:www.images.alumno.local"
    chmod 400 /etc/ssl/dpl/images.alumno.local.key

Al ser autofirmado, el navegador avisa de que la CA no es de confianza: es lo
esperado en el laboratorio (ver teoria https-certificados.md).
