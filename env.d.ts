declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            PORT?: string;

            // Slack creds
            BOT_TOKEN: string;
            APP_TOKEN: string;
            SIGNING_SECRET: string;

            // Slack user creds
            XOXC: string;
            XOXD: string;

            // Postgres creds
            PG_HOST: string;
            PG_USER: string;
            PG_DATABASE: string;
            PG_PASSWORD: string;
        }
    }
}

export { }