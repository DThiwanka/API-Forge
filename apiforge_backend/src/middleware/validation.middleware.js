import { AppError } from '../utils/appError.js';

export function validate(schema) {
  return (req, res, next) => {
    if (typeof schema === 'function') {
      const error = schema(req.body);
      if (error) {
        return next(new AppError(error, 400));
      }
    }
    next();
  };
}

export default validate;
