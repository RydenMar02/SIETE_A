import bcrypt from 'bcryptjs';

export const hashPassword = (contra) => {
    return bcrypt.hashSync(contra, 10);
};

export const compararPassword = (contra, hash) => {
    return bcrypt.compareSync(contra, hash);
};