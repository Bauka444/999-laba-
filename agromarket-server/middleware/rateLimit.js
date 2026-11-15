import { rateLimit } from 'express-rate-limit';

// Фабрика, чтобы в тестах можно было собрать лимитер с маленьким лимитом
export function createAuthLimiter(options = {}) {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Слишком много попыток. Попробуйте через 15 минут' },
    ...options,
  });
}

// Вход: не больше 5 НЕУДАЧНЫХ попыток за 15 минут с одного IP (успешные не считаются)
export const loginLimiter = createAuthLimiter({
  limit: 5,
  skipSuccessfulRequests: true,
  message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут' },
});

// Регистрация: не больше 10 запросов за 15 минут с одного IP.
// В тестах отключён — иначе десятки регистраций из хелперов упрутся в лимит
export const registerLimiter = createAuthLimiter({
  limit: 10,
  skip: () => process.env.NODE_ENV === 'test',
});
