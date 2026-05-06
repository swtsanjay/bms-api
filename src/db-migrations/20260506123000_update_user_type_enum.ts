import type { Knex } from 'knex';

const NEXT_USER_TYPES = [
    'EMPLOYEE',
    'ADMIN',
    'VENDOR',
    'FABRIC_SUPPLIER',
    'CHECKER',
    'SALES_MAN',
] as const;

const PREVIOUS_USER_TYPES = [
    'EMPLOYEE',
    'VENDOR',
    'SUPER_ADMIN',
    'SUB_ADMIN',
    'USER',
    'COMPANY',
    'GUEST',
    'FABRIC_SUPPLIER',
] as const;

export async function up(knex: Knex): Promise<void> {
    await knex.raw(`
        UPDATE users
        SET user_type = 'ADMIN'
        WHERE user_type IN ('SUPER_ADMIN', 'SUB_ADMIN')
    `);

    await knex.raw(`
        UPDATE users
        SET user_type = 'EMPLOYEE'
        WHERE user_type IN ('USER', 'COMPANY', 'GUEST')
    `);

    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('${NEXT_USER_TYPES.join("','")}')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);
}

export async function down(knex: Knex): Promise<void> {
    await knex.raw(`
        UPDATE users
        SET user_type = 'EMPLOYEE'
        WHERE user_type IN ('ADMIN', 'CHECKER', 'SALES_MAN')
    `);

    await knex.raw(`
        ALTER TABLE users
        MODIFY COLUMN user_type ENUM('${PREVIOUS_USER_TYPES.join("','")}')
        NOT NULL DEFAULT 'EMPLOYEE'
    `);
}
