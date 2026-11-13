import { app } from '../server.ts';
import type { Request, Response } from 'express';

export default (req: Request, res: Response) => {
  return app(req, res);
};
