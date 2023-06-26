//Creaccion de servidor
const express = require('express');
const app = express();

// Importar HTTP y Socket.IO

const http = require('http');
const socketIO = require('socket.io');

// Crear el servidor HTTP
const server = http.createServer(app);

// Inicializar el servidor de Socket.IO
const io = socketIO(server);

//Captura de datos inputs del formulario
app.use(express.urlencoded({extended:false}));
app.use(express.json());

// Invocamos a dotenv para las variables de entorno
const dotenv = require('dotenv');
dotenv.config({path:'./env/.env'});

// Seteamos el modulo public
app.use('/resources', express.static('public'));
app.use('/resources', express.static(__dirname + '/public'));


//motor de plantillas
app.set('view engine', 'ejs');

//modulos para hacer el hashisn de pass
const bcryptjs = require('bcryptjs');

//variables de sesion
const session = require('express-session');
app.use(session({
        secret:'secret',
        resave: true,
        saveUninitialized: true
}));

//Base de datos
const connection = require('./database/db');

//Hacer io disponible en todas las rutas
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Escalando Rutas

app.get('/login', (req, res) => {
    res.render('login');
  });

app.get('/register', (req, res) => {
    res.render('register');
  });

app.get('/verificacion', (req, res) => {
    res.render('verificacion');
  });

app.get('/cambiar-contrasena', (req, res) => {
    const correo = req.query.correo; // Obtener el correo del parámetro de la URL
    res.render('cambiar-contrasena', { correo });
  });

app.get('/reporte_estado', (req, res) => {
  res.render('reporte_estado');
});

app.get('/reportes', (req, res) => {
  connection.query(
    'SELECT * FROM reporte',
    (error, results, fields) => {
      if (error) throw error;
      res.json(results);
    }
  );
});

app.get('/subir_reporte', (req, res) => {
    const { LineaRosa_1, LineaAzulFuerte_2, LineaVerdePasto_3, LineaAzulClaro_4, LineaAmarilla_5,
      LineaRoja_6, LineaNaranja_7, LineaVerdeFuerte_8, LineaCafe_9, LineaMorada_A, LineaBicolor_B , LineaDorada_12 } = require('./scripts/data');  // Asegúrate de ajustar la ruta según sea necesario
      res.render('subir_reporte',{
        LineaRosa_1: LineaRosa_1,
        LineaAzulFuerte_2: LineaAzulFuerte_2,
        LineaVerdePasto_3: LineaVerdePasto_3,
        LineaAzulClaro_4: LineaAzulClaro_4,
        LineaAmarilla_5: LineaAmarilla_5,
        LineaRoja_6: LineaRoja_6,
        LineaNaranja_7: LineaNaranja_7,
        LineaVerdeFuerte_8: LineaVerdeFuerte_8,
        LineaCafe_9: LineaCafe_9,
        LineaMorada_A: LineaMorada_A,
        LineaBicolor_B: LineaBicolor_B,
        LineaDorada_12: LineaDorada_12
    });
    });

app.get('/nosotros', (req, res) => {
    res.render('nosotros');
  });
  

//Registro en base de datos
app.post('/register', async (req, res) => {
  const nombre = req.body.nombre;
  const apellido = req.body.apellido;
  const email = req.body.email;
  const telefono = req.body.telefono;
  const contrasena = req.body.contrasena;
  const contrasena_correcta = req.body.contrasena_correcta;

  if (contrasena !== contrasena_correcta) {
    return res.status(400).send("Las contraseñas no coinciden");
  }

  // Agrega la validación del teléfono aquí
  if (telefono.length > 10 || telefono.length < 10|| /\D/.test(telefono)) {  // /\D/ es una expresión regular que coincide con cualquier carácter que no sea un dígito
    return res.render('register',{
      alert: true,
      alertTitle: "Error",
      alertMessage: "Telefono invalido",
      alertIcon: 'error',
      showConfirmButton: false,
      timer: 1500,
      ruta: 'register'
  });
  }

  let passwordHash = await bcryptjs.hash(contrasena, 8);
  connection.query('INSERT INTO registro SET ?',
  {nombre:nombre,apellido:apellido,telefono:telefono,email:email,contrasenas:passwordHash},
  async(error, results)=>{
      if(error){
          console.log(error);
      }else{
          res.render('register',{
              alert: true,
              alertTitle: "Registrado",
              alertMessage: "Registro Completado",
              alertIcon: 'success',
              showConfirmButton: false,
              timer: 2500,
              ruta: 'login'
          })
      }
  }); 
});


// Autentificación
app.post('/auth', async (req, res) => {
  const user = req.body.email;
  const contrasena = req.body.contrasena;

  if (user && contrasena) {
    connection.query('SELECT * FROM registro WHERE email = ?', [user], async (error, results) => {
      if (error) {
        console.log(error);
        res.send('Ocurrió un error en la consulta');
      } else {
        // Asegúrate de que estás consultando la columna correcta para la contraseña.
        if (results.length == 0 || !(await bcryptjs.compare(contrasena, results[0].contrasenas))) {
          res.render('login', {
              alert: true,
              alertTitle: "ERROR",
              alertMessage: "Usuario y/password incorrectas",
              alertIcon: "error",
              showConfirmButton: true,
              timer: 5000,
              ruta: 'login'
            });
        } else {
          req.session.loggedin = true;
          req.session.nombre = results[0].nombre;
          req.session.userID = results[0].id_usuario;
          res.render('login', {
            alert: true,
            alertTitle: "Conexión exitosa",
            alertMessage: "USUARIO CONECTADO",
            alertIcon: "success",
            showConfirmButton: false,
            timer: 2500,
            ruta: ''
          });
        }
      }
    });
  } else {
      res.render('login', {
          alert: true,
          alertTitle: "Advertencia",
          alertMessage: "¡Por favor introduce un usuario y contraseña!",
          alertIcon: "warning",
          showConfirmButton: false,
          timer: 2500,
          ruta: 'login'
        });
  }
});


//Verificacion para cambiar contraseña si existe correo

app.post('/verificacion', (req, res) => {
  const correo = req.body.correo;

  // Verificar si el correo existe en la base de datos
  connection.query('SELECT * FROM registro WHERE email = ?', [correo], (error, results) => {
    if (error) {
      console.log(error);
      res.send('Ocurrió un error en la consulta');
    } else {
      if (results.length === 0) {
        res.render('verificacion', {
          alert: true,
          alertTitle: "Error",
          alertMessage: "El correo electrónico no existe",
          alertIcon: "error",
          showConfirmButton: true,
          timer: 5000,
          ruta:'verificacion'
        });
      } else {
        // Redirigir al formulario de cambio de contraseña con el correo como parámetro
        res.redirect(`/cambiar-contrasena?correo=${correo}`);
      }
    }
  });
});


//Actualización de contraseña
app.post('/pass_update', async (req, res) => {
  const { contrasena, nuevaContrasena, correo } = req.body;
//  const correo = req.body.correo;
  console.log('Correo en POST /pass_update:', correo);
//  const contrasena = req.body.contrasena;
  console.log('Contra 1 en POST /pass_update:', contrasena);
//  const nuevaContrasena = req.body.contrasenados;
  console.log('Contra 2 en POST /pass_update:', nuevaContrasena);

  // Verificar si las contraseñas coinciden
  if (contrasena !== nuevaContrasena) {
    return res.render('cambiar-contrasena', {
      correo: correo, // Asegúrate de enviar correo aquí
      alert: true,
      alertTitle: "Error",
      alertMessage: "Las contraseñas no coinciden",
      alertIcon: "error",
      showConfirmButton: true,
      timer: 5000,
      ruta: 'verificacion'
    });
  }

  // Realizar la actualización de la contraseña en la base de datos
  let passwordHash = await bcryptjs.hash(nuevaContrasena, 8);
  console.log('Contraseña encriptada:', passwordHash);
  connection.query('UPDATE registro SET contrasenas = ? WHERE email = ?', [passwordHash, correo], (error, results) => {
    if (error) {
      console.log(error);
      res.send('Ocurrió un error en la consulta');
    } else {
      res.render('login', {
        alert: true,
        alertTitle: "Contraseña actualizada",
        alertMessage: "La contraseña ha sido actualizada correctamente",
        alertIcon: 'success',
        showConfirmButton: false,
        timer: 2500,
        ruta: 'login'
      });
    }
  });
});

 

// Autentificacion en todas las paginas para cargar mapa en raiz
app.get('/', (req, res)=>{
  const { LineaRosa_1, LineaAzulFuerte_2, LineaVerdePasto_3, LineaAzulClaro_4, LineaAmarilla_5,
    LineaRoja_6, LineaNaranja_7, LineaVerdeFuerte_8, LineaCafe_9, LineaMorada_A, LineaBicolor_B , LineaDorada_12 } = require('./scripts/data');  // Asegúrate de ajustar la ruta según sea necesario
    if(req.session.loggedin){
        res.render('index',{
            login: true,
            nombre: req.session.nombre,
            LineaRosa_1: LineaRosa_1,
            LineaAzulFuerte_2: LineaAzulFuerte_2,
            LineaVerdePasto_3: LineaVerdePasto_3,
            LineaAzulClaro_4: LineaAzulClaro_4,
            LineaAmarilla_5: LineaAmarilla_5,
            LineaRoja_6: LineaRoja_6,
            LineaNaranja_7: LineaNaranja_7,
            LineaVerdeFuerte_8: LineaVerdeFuerte_8,
            LineaCafe_9: LineaCafe_9,
            LineaMorada_A: LineaMorada_A,
            LineaBicolor_B: LineaBicolor_B,
            LineaDorada_12: LineaDorada_12
        });
    }else{
        res.render('index',{
            login: false,
            nombre: '',
            LineaRosa_1: LineaRosa_1,
            LineaAzulFuerte_2: LineaAzulFuerte_2,
            LineaVerdePasto_3: LineaVerdePasto_3,
            LineaAzulClaro_4: LineaAzulClaro_4,
            LineaAmarilla_5: LineaAmarilla_5,
            LineaRoja_6: LineaRoja_6,
            LineaNaranja_7: LineaNaranja_7,
            LineaVerdeFuerte_8: LineaVerdeFuerte_8,
            LineaCafe_9: LineaCafe_9,
            LineaMorada_A: LineaMorada_A,
            LineaBicolor_B: LineaBicolor_B,
            LineaDorada_12: LineaDorada_12
        });
    }
});

// Generar reportes
app.post('/subir_reporte', (req, res) => {
  // Comprobar si el usuario ha iniciado sesión
  if (!req.session.userID) {
    res.render('login', {
      alert: true,
      alertTitle: "Inicia sesión",
      alertMessage: "Debes iniciar sesión para subir un reporte",
      alertIcon: "error",
      showConfirmButton: true,
      timer: 2500,
      ruta: 'login'
    });
    return;  // Salir temprano
  }

  const lineasIndice = parseInt(req.body.lineas, 10);
  const estacionesIndice = parseInt(req.body.estaciones, 10);
  let lineaMetro = req.body.lineas;

  if (lineaMetro === '9') {
    lineaMetro = 'A';
  } else if (lineaMetro === '10') {
    lineaMetro = 'B';
  } else {
    lineaMetro = parseInt(lineaMetro,10)+1;
  }

  const tipoReporte = req.body.tipo_reporte;
  const comentario = req.body.areatexto;
  const hora = req.body.hora;

  const { LineaRosa_1, LineaAzulFuerte_2, LineaVerdePasto_3, LineaAzulClaro_4, LineaAmarilla_5,
    LineaRoja_6, LineaNaranja_7, LineaVerdeFuerte_8, LineaCafe_9, LineaMorada_A, LineaBicolor_B, LineaDorada_12 } = require('./scripts/data');
  const lineas = [LineaRosa_1, LineaAzulFuerte_2, LineaVerdePasto_3, LineaAzulClaro_4, LineaAmarilla_5, LineaRoja_6, LineaNaranja_7, LineaVerdeFuerte_8, LineaCafe_9, LineaMorada_A, LineaBicolor_B, LineaDorada_12];

  const lineaSeleccionada = lineas[lineasIndice];
  const estacionSeleccionada = lineaSeleccionada[estacionesIndice];
  const direccionEstacion = estacionSeleccionada.address;

  connection.query(
    'INSERT INTO reporte (id_usuario, tipo_reporte, estacion, linea, fecha, comentario, hora) VALUES (?, ?, ?, ?, CURDATE(), ?, ?)',
    [req.session.userID, tipoReporte, direccionEstacion, lineaMetro, comentario, hora],
    (error, results, fields) => {
      if (error) throw error;

      // Emitir el evento de nuevo reporte a todos los clientes conectados
      io.sockets.emit('nuevo_reporte', {
        idUsuario: req.session.userID,
        tipoReporte,
        estacion: direccionEstacion,
        linea: lineaMetro,
        comentario,
        hora
      });
      res.render('reporte_estado', {
        alert: true,
        alertTitle: "Reporte realizado",
        alertMessage: "El reporte se ha aprobado",
        alertIcon: "success",
        showConfirmButton: true,
        timer: 2500,
        ruta: ''
      });
    }
  );
});


// Salir de sesion
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });

app.listen(3000, (req, res) =>{
    console.log('Server corriendo en localhost:3000');
});
