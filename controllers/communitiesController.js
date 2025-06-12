const pool = require('../db');
const { toCamelCase } = require('../utils');


async function addCommunity(req, res) {
    const { userId, name, description } = req.body;

    if (!userId || !name) {
        return res.status(400).json({ error: 'Faltan campos obligatorios: userId y name' });
    }

    try {
        // Crear comunidad
        const result = await pool.query(
            `INSERT INTO communities (user_id, name, description)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [userId, name, description || null]
        );

        const community = result.rows[0];

        // Suscribir al creador automáticamente
        await pool.query(
            `INSERT INTO community_subscriptions (user_id, community_id)
             VALUES ($1, $2)`,
            [userId, community.id]
        );

        res.status(201).json({ message: 'Comunidad creada y suscripto automáticamente', community: toCamelCase(community) });

    } catch (err) {
        console.error(err);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'El nombre de comunidad ya existe o ya estás suscripto' });
        }

        res.status(500).json({ error: 'Error al crear comunidad' });
    }
}


async function getCommunities(req, res) {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: 'Falta userId en la query' });
    }

    try {
        const result = await pool.query(
            `SELECT cc.*, u.username AS creator_username, c.*
             FROM community_subscriptions c
                      JOIN users u ON c.user_id = u.id
                      JOIN communities cc ON c.community_id = cc.id WHERE u.id = $1
             ORDER BY cc.name ASC;
            `,
            [userId]
        );

        res.json({ communities: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunidades del usuario' });
    }
}


async function getAllCommunities(req, res) {
    try {
        const result = await pool.query(
            `SELECT c.*, u.username AS creator_username
             FROM communities c
             JOIN users u ON c.user_id = u.id
             ORDER BY c.name ASC`
        );
        res.json({ communities: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comunidades' });
    }
}

async function subscribeToCommunity(req, res) {
    const { userId, communityId } = req.body;

    if (!userId || !communityId) {
        return res.status(400).json({ error: 'Faltan userId o communityId' });
    }

    try {
        await pool.query(
            `INSERT INTO community_subscriptions (user_id, community_id)
             VALUES ($1, $2)`,
            [userId, communityId]
        );
        res.status(201).json({ message: 'Suscripción exitosa' });
    } catch (err) {
        console.error(err);

        if (err.code === '23505') {
            return res.status(409).json({ error: 'Ya estás suscripto a esta comunidad' });
        }

        res.status(500).json({ error: 'Error al suscribirse a la comunidad' });
    }
}

async function createPost(req, res) {
    const { userId, communityId, title, body, topic, photos } = req.body;

    if (!userId || !communityId || !title || !body || !topic) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        // Verificar que el usuario esté suscripto
        const subscriptionCheck = await pool.query(
            `SELECT 1 FROM community_subscriptions
             WHERE user_id = $1 AND community_id = $2`,
            [userId, communityId]
        );

        if (subscriptionCheck.rowCount === 0) {
            return res.status(403).json({ error: 'El usuario no está suscripto a esta comunidad' });
        }

        // Crear el post
        const postResult = await pool.query(
            `INSERT INTO communities_posts (user_id, community_id, title, body, topic)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, communityId, title, body, topic]
        );

        const post = postResult.rows[0];

        // Agregar fotos si vienen
        if (Array.isArray(photos) && photos.length > 0) {
            const insertPromises = photos.map(url =>
                pool.query(
                    `INSERT INTO communities_posts_photos (post_id, url)
                     VALUES ($1, $2)`,
                    [post.id, url]
                )
            );
            await Promise.all(insertPromises);
        }

        res.status(201).json({ message: 'Posteo creado', post: toCamelCase(post) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear el posteo' });
    }
}

async function updatePost(req, res) {
    const { postId } = req.params;
    const { userId, title, body, topic, photos } = req.body;

    if (!userId || !title || !body || !topic) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        // Verifica que el post exista y sea del usuario
        const result = await pool.query(
            `SELECT * FROM communities_posts WHERE id = $1 AND user_id = $2`,
            [postId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(403).json({ error: 'No autorizado para editar este post' });
        }

        // Actualiza el post
        await pool.query(
            `UPDATE communities_posts
             SET title = $1, body = $2, topic = $3, updated_at = NOW()
             WHERE id = $4`,
            [title, body, topic, postId]
        );

        // Elimina fotos previas y agrega nuevas (opcional según lógica)
        if (Array.isArray(photos)) {
            await pool.query(`DELETE FROM communities_posts_photos WHERE post_id = $1`, [postId]);

            const insertPromises = photos.map(url =>
                pool.query(
                    `INSERT INTO communities_posts_photos (post_id, url) VALUES ($1, $2)`,
                    [postId, url]
                )
            );
            await Promise.all(insertPromises);
        }

        res.json({ message: 'Post actualizado' });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al actualizar el post' });
    }
}

async function getCommunityPosts(req, res) {
    const { communityId } = req.params;
    const { since, until } = req.query;
    const { topics } = req.body;
    
    // Validar que el rango de fechas sea coherente
    if (since && until && new Date(since) > new Date(until)) {
        return res.status(400).json({ error: 'El parámetro "since" no puede ser posterior a "until"' });
    }

    let query = `
        SELECT p.id, p.title, p.body, p.topic, p.created_at, u.username AS author,
               COALESCE(json_agg(pp.url) FILTER (WHERE pp.url IS NOT NULL), '[]') AS photos
        FROM communities_posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN communities_posts_photos pp ON p.id = pp.post_id
        WHERE p.community_id = $1
    `;
    const params = [communityId];
    let paramIndex = 2;

    // Filtros opcionales
    if (since) {
        query += ` AND p.created_at >= $${paramIndex}`;
        params.push(since);
        paramIndex++;
    }

    if (until) {
        const parsedUntil = until && !until.includes('T') ? until + 'T23:59:59.999' : until;
        query += ` AND p.created_at <= $${paramIndex}`;
        params.push(parsedUntil);
        paramIndex++;
    }

    if (Array.isArray(topics) && topics.length > 0) {
        const topicPlaceholders = topics.map((_, i) => `$${paramIndex + i}`).join(', ');
        query += ` AND p.topic IN (${topicPlaceholders})`;
        params.push(...topics);
        paramIndex += topics.length;
    }

    query += `
        GROUP BY p.id, p.title, p.body, p.topic, p.created_at, u.username
        ORDER BY p.created_at DESC
    `;

    try {
        const result = await pool.query(query, params);
        res.json({ posts: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener los posteos' });
    }
}


async function getPostById(req, res) {
    const { postId } = req.params;

    try {
        const result = await pool.query(
            `SELECT p.*, u.username AS author, c.name AS community_name,
                    COALESCE(json_agg(pp.url) FILTER (WHERE pp.url IS NOT NULL), '[]') AS photos
             FROM communities_posts p
             JOIN users u ON p.user_id = u.id
             JOIN communities c ON p.community_id = c.id
             LEFT JOIN communities_posts_photos pp ON p.id = pp.post_id
             WHERE p.id = $1
             GROUP BY p.id, u.username, c.name`,
            [postId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Post no encontrado' });
        }

        res.json({ post: toCamelCase(result.rows[0]) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener el post' });
    }
}

async function addComment(req, res) {
    const { postId, userId, body } = req.body;

    if (!postId || !userId || !body) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO communities_posts_comments (post_id, user_id, body)
             VALUES ($1, $2, $3) RETURNING *`,
            [postId, userId, body]
        );

        res.status(201).json({ message: 'Comentario creado', comment: toCamelCase(result.rows[0]) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al agregar el comentario' });
    }
}

async function getComments(req, res) {
    const { postId } = req.params;

    try {
        const result = await pool.query(
            `SELECT c.*, u.username
             FROM communities_posts_comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.post_id = $1
             ORDER BY c.created_at ASC`,
            [postId]
        );

        res.json({ comments: toCamelCase(result.rows) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al obtener comentarios' });
    }
}

module.exports = {
    addCommunity,
    getCommunities,
    getAllCommunities,
    subscribeToCommunity,
    createPost,
    updatePost,
    getCommunityPosts,
    getPostById,
    addComment,
    getComments
};