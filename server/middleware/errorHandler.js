// Postgres error codes are 5-char alphanumeric strings (e.g. '23514').
const isPgError = (err) => typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code);

module.exports = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`, err.detail ? `| detail: ${err.detail}` : '');
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Record already exists.' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record not found.' });
  }
  if (err.code === '23514') {
    // Constraint names follow <table>_<column>_check; recover the column
    // so the client learns which field was rejected, nothing more.
    let field = null;
    if (err.constraint && err.constraint.endsWith('_check')) {
      field = err.constraint.slice(0, -'_check'.length);
      if (err.table && field.startsWith(err.table + '_')) {
        field = field.slice(err.table.length + 1);
      }
    }
    return res.status(400).json({
      error: field ? `Invalid value for ${field}.` : 'Invalid input.',
    });
  }
  if (err.code === '22P02') {
    return res.status(400).json({ error: 'Invalid input format.' });
  }
  if (err.code === '23502') {
    return res.status(400).json({
      error: err.column ? `Missing required field: ${err.column}.` : 'Missing required field.',
    });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token.' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired.' });
  }
  // Any other DB error: never echo Postgres messages to the client.
  if (isPgError(err)) {
    return res.status(500).json({ error: 'Internal server error.' });
  }
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.'
  });
};
