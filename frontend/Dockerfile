FROM nginx:1.25-alpine

LABEL maintainer="DevOps Team <devops@taskmanager.local>" \
      version="1.0" \
      description="TaskManager frontend served by Nginx"

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html /usr/share/nginx/html/index.html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/index.html >/dev/null || exit 1
