const jwt = require('jsonwebtoken');
const {generateAccessToken} = require('./generateToken');


const renewToken = (req, res) =>{
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
       console.log('no refresh token please login');
    }

     
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err) {
             console.log('Invalid refresh token');
        }
        if (decoded) {
            const newAccessToken = generateAccessToken(decoded.id, decoded.email, decoded.role, decoded.name);
            res.cookie('accessToken', newAccessToken, { maxAge: 15 * 60 * 1000, httpOnly: true, secure: true, sameSite: 'Strict' });
            req.user = decoded;
        }
       
    });

}




module.exports = renewToken;