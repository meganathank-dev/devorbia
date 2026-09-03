/**
 * Utility for setting and clearing authentication cookies.
 */

const setAuthCookies = (res, accessToken, refreshToken) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Parse expiration strings like "15m" and "7d" to milliseconds for cookie maxAge
  // In a real application, you might use a library like `ms` for this, or simply define
  // expiration in milliseconds in constants or environment variables.
  // For simplicity, we hardcode reasonable default maxAge here that align with tokens.
  const accessMaxAge = 15 * 60 * 1000; // 15 minutes
  const refreshMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: accessMaxAge,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    path: '/api/v1/auth/refresh', // Restrict refresh token to refresh endpoint if desired, but for Phase 1A we keep it general if auth endpoint doesn't exist yet, wait, let's keep it root for now or specific to auth. Actually, standard is root or '/api/v1/auth/refresh'. We'll use root for simplicity unless specified.
    maxAge: refreshMaxAge,
  });
};

const clearAuthCookies = (res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions); // Also clear refresh token
};

module.exports = {
  setAuthCookies,
  clearAuthCookies,
};
