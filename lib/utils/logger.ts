import winston from 'winston';
const logger = winston.createLogger({
    transports: [
        new winston.transports.Console(process.env.NODE_ENV === 'development' ? { level: 'debug' } : { level: 'info' }),
    ],
    format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple(),
        winston.format.timestamp(),
    )
});

export default logger;