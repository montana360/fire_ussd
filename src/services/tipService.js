
const db = require("../db/connection");

async function createTip(data) {
    const { title, message, category } = data;

    if (!title?.trim() || !message?.trim() || !category?.trim()) {
        throw new Error("Title, message and category are required.");
    }

    const [result] = await db.query(
        `INSERT INTO safety_tips (title, message, category)
         VALUES (?, ?, ?)`,
        [title.trim(), message.trim(), category.trim()]
    );

    return result;
}

async function getAllTips() {
    const [rows] = await db.query(
        `SELECT *
         FROM safety_tips
         ORDER BY created_at DESC`
    );

    return rows;
}

async function getRandomTip() {
    const [rows] = await db.query(
        `SELECT *
         FROM safety_tips
         ORDER BY RAND()
         LIMIT 1`
    );

    return rows.length ? rows[0] : null;
}

async function getRandomTipByCategory(category) {
    if (!category) {
        throw new Error("Category is required.");
    }

    const [rows] = await db.query(
        `SELECT *
         FROM safety_tips
         WHERE category = ?
         ORDER BY RAND()
         LIMIT 1`,
        [category]
    );

    return rows.length ? rows[0] : null;
}

async function getTipById(id) {
    const [rows] = await db.query(
        `SELECT *
         FROM safety_tips
         WHERE id = ?
         LIMIT 1`,
        [id]
    );

    return rows.length ? rows[0] : null;
}

async function updateTip(id, data) {
    const { title, message, category } = data;

    if (!title?.trim() || !message?.trim() || !category?.trim()) {
        throw new Error("Title, message and category are required.");
    }

    const [result] = await db.query(
        `UPDATE safety_tips
         SET title = ?, message = ?, category = ?
         WHERE id = ?`,
        [title.trim(), message.trim(), category.trim(), id]
    );

    return result;
}

async function deleteTip(id) {
    const [result] = await db.query(
        `DELETE FROM safety_tips WHERE id = ?`,
        [id]
    );

    return result;
}

async function getCategories() {
    const [rows] = await db.query(
        `SELECT DISTINCT category
         FROM safety_tips
         WHERE category IS NOT NULL
           AND category <> ''
         ORDER BY category`
    );

    return rows;
}

module.exports = {
    createTip,
    getAllTips,
    getRandomTip,
    getRandomTipByCategory,
    getTipById,
    updateTip,
    deleteTip,
    getCategories
};
