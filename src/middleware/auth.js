const tokenServices = require('../../services/token');

module.exports = {
    verificarAdmin:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
    verificarAdminCot:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador', 'cotizaciones'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
    verificarAdminCal:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador', 'calidad'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
    verificarAdminSopCom:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador', 'soporte','comercial'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
    verificarAdminCalCot:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador', 'cotizaciones','calidad'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
    verificarUsuario:async (req, res, next) =>{
        if(!req.headers.token){
            return res.status(404).send({
                message: 'Token no encontrado'
            });
        }else{
            const validationResponse = await tokenServices.decode(req.headers.token);
            if(validationResponse === 'token vencido'){
                return res.status(403).send({
                    message: 'Token vencido'
                })
            }
            else if(['administrador', 'cotizaciones','calidad','soporte','comercial'].includes(validationResponse.rol)){
                next();//si es usuario es administrador, bien pueda
            }else{
                return res.status(403).send({
                    message: 'No autorizado'
                })
            }
        }
    },
}