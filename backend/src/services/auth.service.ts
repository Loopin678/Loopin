import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"

import { createUser, 
    findUserByEmail, 
    findUserById,
 } from "../repositories/user.repository";

import {User} from "../types/user.js"
import {JWT_EXPIRES_IN, JWT_SECRET} from "../library/auth.js";


export type PublicUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
};

