# TaskManager — déploiement multi-services avec Docker Compose

Application web **frontend Nginx**, **API Node.js** et **PostgreSQL**, conteneurisée et prête pour un rapport technique centré sur **Docker Compose** (build, réseaux, volumes, healthchecks).

## Structure du projet

```text
taskmanager/
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   └── index.html
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   └── package.json
├── database/
│   └── init.sql
├── docker-compose.yml
├── docker-stack.yml      # Partie 3 — Docker Swarm
├── .env.example
└── README.md
```

## Partie 1 — Build des images

```bash
docker build -t taskmanager/backend:1.0 ./backend
docker build -t taskmanager/frontend:1.0 ./frontend
docker images | findstr taskmanager
```

## Partie 2 — Docker Compose (périmètre principal)

```bash
cp .env.example .env
docker compose up -d --build
docker compose ps
docker compose logs -f backend
curl.exe -s http://localhost:8080/api/health
curl.exe -s http://localhost:8080/api/tasks
docker compose down -v
```

Ouvrir l’interface : `http://localhost:8080` (port configurable via `FRONTEND_PORT` dans `.env`).

## Partie 3 — Docker Swarm

**Prérequis** : arrêter la stack Compose pour libérer les ports et éviter deux orchestrateurs sur les mêmes réseaux.

```bash
docker compose down
```

Reconstruire les images (notamment après modification de `nginx.conf`) :

```bash
docker build -t taskmanager/backend:1.0 ./backend
docker build -t taskmanager/frontend:1.0 ./frontend
```

Initialiser le cluster (une seule fois sur la machine manager) :

```bash
docker swarm init --advertise-addr <IP_DU_MANAGER>
```

Sur un nœud worker (commande affichée par `swarm init`) :

```bash
docker swarm join --token <TOKEN> <MANAGER_IP>:2377
docker node ls
```

**Secret PostgreSQL** (obligatoire : le stack référence `db_password` en `external: true`). Le contenu doit correspondre au mot de passe que vous souhaitez pour l’utilisateur Postgres (ex. même valeur que `DB_PASSWORD` dans `.env.example`). Si le secret existe déjà : `docker secret rm db_password` puis recréation.

```powershell
# Windows PowerShell — éviter le saut de ligne dans le secret :
"taskpass_securise_2024" | docker secret create db_password -
```

Déployer la stack :

```bash
docker stack deploy -c docker-stack.yml taskmanager
docker stack services taskmanager
docker stack ps taskmanager
```

Interface applicative : **http://localhost/** (port **80**). Visualiseur Swarm (si inclus dans le stack) : **http://localhost:8080**.

Mise à l’échelle et mises à jour :

```bash
docker service scale taskmanager_backend=5
docker service update --image taskmanager/backend:2.0 --update-parallelism 1 --update-delay 10s taskmanager_backend
docker service rollback taskmanager_backend
```

Suppression :

```bash
docker stack rm taskmanager
```

**Remarque** : volume `db_data` du stack persistant ; pour réinitialiser la base après un changement de secret, supprimer le volume nommé du projet une fois la stack arrêtée (`docker volume ls` puis `docker volume rm …`).

## Caractéristiques techniques

- Images avec tags explicites (`nginx:1.25-alpine`, `node:18-alpine`, `postgres:15-alpine`).
- Backend Express avec retry PostgreSQL (10 tentatives, 3 s d’intervalle).
- Healthchecks sur les services **Docker Compose** et dans **docker-stack.yml** (Swarm).
- Mot de passe DB : variables d’environnement (Compose) ou **Docker Secret** + `DB_PASSWORD_FILE` (Swarm), pas en dur dans le code applicatif.
- Backend sous utilisateur non-root (`appuser`).
- Frontend **SPA-like** : liste, stats et hostname backend mis à jour sans rechargement complet.
- Reverse proxy Nginx : `/api/` → `backend:5000`.

## API backend

- `GET /health`
- `GET /tasks`
- `POST /tasks`
- `PUT /tasks/:id/toggle`
- `DELETE /tasks/:id`

Exemple de réponse `/health` :

```json
{
  "status": "ok",
  "hostname": "backend-container-id",
  "timestamp": "2026-04-29T21:00:00.000Z",
  "uptime": 128.541
}
```
