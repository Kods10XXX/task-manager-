CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO tasks (title, priority, done) VALUES
('Configurer Docker Compose', 'high', false),
('Creer les Dockerfiles multi-stage', 'high', true),
('Tester les healthchecks', 'medium', false),
('Valider le deploiement Swarm', 'medium', false),
('Documenter les commandes DevOps', 'low', true);
