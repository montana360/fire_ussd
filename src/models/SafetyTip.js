const db = require("../db/connection");

/**
 * Create a new safety tip
 */
async function createTip(data) {

    const {
        title,
        message,
        category
    } = data;

    const [result] = await db.query(
        `
        INSERT INTO safety_tips
        (
            title,
            message,
            category
        )
        VALUES (?,?,?)
        `,
        [
            title,
            message,
            category
        ]
    );

    return result;
}

/**
 * Get all safety tips
 */
async function getAllTips() {

    const [rows] = await db.query(
        `
        SELECT *
        FROM safety_tips
        ORDER BY created_at DESC
        `
    );

    return rows;
}

/**
 * Get a random safety tip
 */
async function getRandomTip() {

    const [rows] = await db.query(
        `
        SELECT *
        FROM safety_tips
        ORDER BY RAND()
        LIMIT 1
        `
    );

    return rows.length ? rows[0] : null;
}

/**
 * Get random tip by category
 */
async function getRandomTipByCategory(category) {

    const [rows] = await db.query(
        `
        SELECT *
        FROM safety_tips
        WHERE category = ?
        ORDER BY RAND()
        LIMIT 1
        `,
        [category]
    );

    return rows.length ? rows[0] : null;
}

/**
 * Get tip by ID
 */
async function getTipById(id) {

    const [rows] = await db.query(
        `
        SELECT *
        FROM safety_tips
        WHERE id = ?
        `,
        [id]
    );

    return rows.length ? rows[0] : null;
}

/**
 * Update safety tip
 */
async function updateTip(id, data) {

    const {
        title,
        message,
        category
    } = data;

    const [result] = await db.query(
        `
        UPDATE safety_tips
        SET
            title = ?,
            message = ?,
            category = ?
        WHERE id = ?
        `,
        [
            title,
            message,
            category,
            id
        ]
    );

    return result;
}

/**
 * Delete safety tip
 */
async function deleteTip(id) {

    const [result] = await db.query(
        `
        DELETE FROM safety_tips
        WHERE id = ?
        `,
        [id]
    );

    return result;
}

/**
 * Get all categories
 */
async function getCategories() {

    const [rows] = await db.query(
        `
        SELECT DISTINCT category
        FROM safety_tips
        ORDER BY category
        `
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