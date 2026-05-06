import { Knex } from 'knex';

const NEXT_ENUM = "ENUM('EXPENSE', 'PAYMENT', 'SALARY')";
const PREV_ENUM = "ENUM('EXPENSE', 'PAYMENT')";

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        ALTER TABLE transactions
        MODIFY COLUMN type ${NEXT_ENUM} NOT NULL DEFAULT 'PAYMENT'
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        UPDATE transactions
        SET type = 'PAYMENT'
        WHERE type = 'SALARY'
    `);

    await knex.raw(`
        ALTER TABLE transactions
        MODIFY COLUMN type ${PREV_ENUM} NOT NULL DEFAULT 'PAYMENT'
    `);
}
