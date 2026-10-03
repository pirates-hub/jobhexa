import { describe, it, expect, vi } from 'vitest';
import { successResponse, errorResponse } from './apiResponse.js';

const mockRes = () => {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json };
};

describe('apiResponse', () => {
  describe('successResponse', () => {
    it('should return success true with data and default 200', () => {
      const res = mockRes();
      successResponse(res, { name: 'JobHexa' });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ success: true, data: { name: 'JobHexa' } });
    });

    it('should return success true without data when data is null', () => {
      const res = mockRes();
      successResponse(res, null, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it('should use custom status code', () => {
      const res = mockRes();
      successResponse(res, { id: 1 }, 201);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('errorResponse', () => {
    it('should return success false with message and default 500', () => {
      const res = mockRes();
      errorResponse(res, 'Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Not found' });
    });

    it('should use default message and status when not provided', () => {
      const res = mockRes();
      errorResponse(res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ success: false, message: 'Something went wrong' });
    });
  });
});
