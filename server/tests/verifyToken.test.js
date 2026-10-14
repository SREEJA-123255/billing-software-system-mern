import { jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import verifyToken from '../middleware/verifyToken.js'

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_for_jest';

const USER_ID = '665f1a2b3c4d5e6f7a8b9c20';

const makeRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('verifyToken (Team 1 JWT integration)', () => {
    test('sets req.user from a valid token', () => {
        const token = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = makeRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(req.user).toEqual({ _id: USER_ID });
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    test('401 when no Authorization header is sent', () => {
        const req = { headers: {} };
        const res = makeRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test('401 when the header does not start with "Bearer "', () => {
        const req = { headers: { authorization: 'Token abc123' } };
        const res = makeRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('401 for a token signed with the wrong secret', () => {
        const token = jwt.sign({ id: USER_ID }, 'a_different_secret');
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = makeRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid authentication token.' });
    });

    test('401 with a clear message for an expired token', () => {
        const token = jwt.sign({ id: USER_ID }, process.env.JWT_SECRET, { expiresIn: -1 });
        const req = { headers: { authorization: `Bearer ${token}` } };
        const res = makeRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Session expired. Please log in again.' });
    });
});