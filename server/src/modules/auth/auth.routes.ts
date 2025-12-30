import { Router, Request, Response } from 'express';
import { AuthService } from './auth.service';

const router = Router();
const authService = AuthService.getInstance();

/**
 * POST /api/auth/signup
 * Register a new user
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const { user, token } = await authService.registerUser({
      username,
      email,
      password,
    });

    res.status(201).json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(400).json({
      error: error.message || 'Failed to create account',
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const { user, token } = await authService.loginUser(username, password);

    res.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({
      error: error.message || 'Invalid credentials',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.body.token;

    if (token) {
      authService.logout(token);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(400).json({ error: 'Failed to logout' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = authService.verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = authService.getUser(payload.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ error: 'Failed to get user info' });
  }
});

export default router;

