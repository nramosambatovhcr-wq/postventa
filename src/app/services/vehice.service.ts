import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { from, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class VehiceService {

baseUrl='https://bodega.vehicentro.com:1830/api';
  url ='https://bodega.vehicentro.com:1830/api/api/Sislaboratorio/login';
 // url='https://bodega.vehicentro.com:1830/api/login.php';
  url2='https://bodega.vehicentro.com:1830/api/buscar.php';
  url3='https://bodega.vehicentro.com:1830/api/ingmotor.php';
  url4='https://bodega.vehicentro.com:1830/api/buscarmot.php';
  url5='https://bodega.vehicentro.com:1830/api/ingchasis.php';
  url6='https://bodega.vehicentro.com:1830/api/buscarchas.php';
  url7='https://bodega.vehicentro.com:1830/api/modelos.php';
  //url8='https://bodega.vehicentro.com:1830/api/linea.php';
  url8='https://bodega.vehicentro.com:1830/api/api/Laboratorio/lineas';
  url9='https://bodega.vehicentro.com:1830/api/categoria.php';
  url9_1='https://bodega.vehicentro.com:1830/api/categoriaid.php';
  url10='https://bodega.vehicentro.com:1830/api/drive.php';
  url11='https://bodega.vehicentro.com:1830/api/caja.php';
  url12='https://bodega.vehicentro.com:1830/api/ingcaja.php';
  url13='https://bodega.vehicentro.com:1830/api/buscarmodelo.php';

  url14='https://bodega.vehicentro.com:1830/api/chasis.php';
  url15='https://bodega.vehicentro.com:1830/api/frontal.php';
  url16='https://bodega.vehicentro.com:1830/api/ingfrontal.php';
  url17='https://bodega.vehicentro.com:1830/api/diferencial.php';
  url18='https://bodega.vehicentro.com:1830/api/ingdiferencial.php';
  url19='https://bodega.vehicentro.com:1830/api/ingrerepuesto.php';
  url20='https://bodega.vehicentro.com:1830/api/ingrevehiculo.php';
  url21='https://bodega.vehicentro.com:1830/api/buscarvehiall.php';
  url22='https://bodega.vehicentro.com:1830/api/imagenes/ingreimagen.php';
  url23='https://bodega.vehicentro.com:1830/api/ingreimage.php';
 
  constructor(public http: HttpClient) { }

   public getTotalLaboratorioData(idv:any): Observable<any[]> {
    const apiUrl = `${this.baseUrl}/api/Laboratorio/total=${idv}`;
    return this.http.get<any[]>(apiUrl);
  }
 public getRepuestoById(id: number): Observable<any> {
    const apiUrl = `${this.baseUrl}/api/Laboratorio/repuesto/${id}`;
    return this.http.get<any>(apiUrl);
  }

  getUsuariosParaAsignar() {
  return this.http.get(`${this.baseUrl}/api/Laboratorio/disponibles`);
}

getMotores() { return this.http.get(`${this.baseUrl}/api/Laboratorio/motores`); }
getCajas()  { return this.http.get(`${this.baseUrl}/api/Laboratorio/caja`); }
getDrives() { return this.http.get(`${this.baseUrl}/api/Laboratorio/drive`); }
getFrontales() { return this.http.get(`${this.baseUrl}/api/Laboratorio/frontal`); }
getDiferenciales() { return this.http.get(`${this.baseUrl}/api/Laboratorio/diferencial`); }

actualizarVehiculo(id: number, data: any) {
  return this.http.put(`${this.baseUrl}/api/Laboratorio/vehiculos/${id}`, data);
}
actualizarVehiculoCompleto(id: number, data: any) {
  return this.http.put(`${this.baseUrl}/api/Laboratorio/vehiculo/actualizar-completo/${id}`, data);
}

eliminarVehiculo(id: number) {
  return this.http.delete(`${this.baseUrl}/api/Laboratorio/vehiculo/eliminar/${id}`);
}

   public updateVehicle(id: number, vehicleData: any): Observable<any> {
    // Assuming your API has a PUT or POST endpoint like /api/Laboratorio/vehicle/{id} for updates
    // You might need to adjust the endpoint and method (PUT/POST) based on your backend API design.
    const apiUrl = `${this.baseUrl}/api/Laboratorio/part/${id}`;
    // Send the entire vehicleData object. Ensure your backend expects a JSON body.
    return this.http.put<any>(apiUrl, vehicleData); // Or this.http.post<any>(apiUrl, vehicleData); if it's a POST
  }

  public agencia2()  {
  
    let  urlServerc = this.url8;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public linea()  {
    let  urlServerc = this.url8;
    return this.http.get(urlServerc, { responseType: 'json' });
  }
  public categoria1(codigo: any) {
    const apiUrl = `${this.baseUrl}/api/Laboratorio/categoriasLinea`;
    return this.http.post(apiUrl, { cod: codigo });
  }

  public categoria(codigoLinea: string) {
    const url = `${this.baseUrl}/api/Laboratorio/categoriasLinea`;
    const params = new HttpParams().set('cod', codigoLinea);
    
    return this.http.get(url, { params });
  }



  public categoriaid(codigo: any) {
    const apiUrl = `${this.baseUrl}/api/Laboratorio/categorias/${codigo}`;
    return this.http.get(apiUrl, { responseType: 'json' });
  }

   public formData(data: FormData): Observable<any> {
   // const url = API_URL.formData;
    //return this.restService.postFormData(url, data);
    let  urlServerc = this.url23;
      return this.http.post(urlServerc, data, {responseType:'json'} );
    
  }

  public modelolinea1(codigo:any)  {
    let  urlServerc = this.url13;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('cod', codigo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public modelolinea(codigoLinea: string) {
    const url = `${this.baseUrl}/api/Laboratorio/porCodigoLinea`;
    const params = new HttpParams().set('codigo', codigoLinea);
    
    return this.http.get(url, { params });
  }

public getVehiculosCompletos(): Observable<any> {
  const url = `${this.baseUrl}/api/Laboratorio/vehiculos-completos`; // ← tu ruta
  return this.http.get(url);
}

public getReporteRepuestosPorVehiculo(): Observable<any> {
  const url = `${this.baseUrl}/api/Laboratorio/reporte-repuestos-por-vehiculo`;
  return this.http.get(url);
}
  public registerVehicle(vehicleData: any) {
    const apiUrl = `${this.baseUrl}/api/Laboratorio/vehicle/register`;
    /*
    const formData = new FormData();
    formData.append('idlinea', vehicleData.idlinea);
    formData.append('idchasis', vehicleData.idchasis);
    formData.append('idmotor', vehicleData.idmotor);
    formData.append('idfrontal', vehicleData.idfrontal);
    formData.append('idcaja', vehicleData.idcaja);
    formData.append('iddrive', vehicleData.iddrive);
    formData.append('idmodelo', vehicleData.idmodelo);
    formData.append('iddiferencial', vehicleData.iddiferencial);
   */
    
    
    //return this.http.post<any>(apiUrl, formData, { responseType: 'json' });
    return this.http.post<any>(apiUrl, vehicleData);
    
  }

  registerVehicleBasico(data: any) {
  return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/vehicle/register-minimal`, data);
}

 cambiarEstadoRevision(revisionId: number, estadoRevision: string) {
  return this.http.patch<any>(
    `${this.baseUrl}/api/Laboratorio/revision/${revisionId}/estado`,
    { estadoRevision }
  );
}

crearChasis(codigo: string) {
  return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crearchasis`, { codigo });
}

crearModelo(codigo: string, idLinea: string) {
  return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crearmodelo`, { codigo, idLinea: parseInt(idLinea) });
}

  guardarRepuesto(datos: any, archivo: File) {
    const url = `${this.baseUrl}/api/Laboratorio/guardar`; // Ajusta la URL según tu configuración
    
    // Crear FormData para enviar los datos y el archivo
    const formData = new FormData();
  //  formData.append('Img', archivo);
    formData.append('Nom', datos.nom);
    formData.append('Cat', datos.cat);
    formData.append('Desc', datos.desc);
    formData.append('Cod', datos.cod);
    formData.append('Cant', datos.cant.toString());
    formData.append('Obser', datos.obser);
    formData.append('Vehi', datos.vehi.toString());
    let pedido = {
      Nom: datos.nom,
      Cat: datos.cat,
      Desc: datos.desc,
      Cod: datos.cod,
      Cant:datos.datos.cant.toString(),
      Obser:datos.obser,
      Vehi:datos.vehi.toString(),
      
    };
    return this.http.post<any>(url, pedido);
  }

  public buscarep(nombre:any)  {
    let  urlServerc = this.url2;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('cod', nombre);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public buscarmod()  {
    let  urlServerc = this.url7;
    let body = new HttpParams();
    body = body.set('op', 'select');  
     
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public buscarmot1()  {
    let  urlServerc = this.url4;
    let body = new HttpParams();
    body = body.set('op', 'select');  
   
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }
  public buscarmot()  {
    const url = `${this.baseUrl}/api/Laboratorio/motores`;
    return this.http.get(url, { responseType: 'json' });
  }
  public buscardrive1()  {
    let  urlServerc = this.url10;
    let body = new HttpParams();
    body = body.set('op', 'select');  
   
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public buscardrive()  {
    const url = `${this.baseUrl}/api/Laboratorio/drive`;
    return this.http.get(url, { responseType: 'json' });
  }

  public buscarcaja1()  {
    let  urlServerc = this.url11;
    let body = new HttpParams();
    body = body.set('op', 'select');  
   
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public buscarcaja()  {
    const url = `${this.baseUrl}/api/Laboratorio/caja`;
    return this.http.get(url, { responseType: 'json' });
  }

  public vehiculo(codigo:any , modelo:any)  {
    let  urlServerc = this.url20;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('motor', codigo);  
    body = body.set('modelo', modelo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }
  public repuesto(codigo:any , modelo:any)  {
    let  urlServerc = this.url19;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('motor', codigo);  
    body = body.set('modelo', modelo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }


  public motor(codigo:any , modelo:any)  {
    let  urlServerc = this.url3;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('motor', codigo);  
    body = body.set('modelo', modelo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }
  public cajas(codigo:any , modelo:any)  {
    let  urlServerc = this.url2;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('caja', codigo);  
    body = body.set('modelo', modelo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public buscarchas(modelo:any)  {
    let  urlServerc = this.url6;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('cod', modelo);  
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public chasis1(codigo:any)  {
    let  urlServerc = this.url5;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('chasis', codigo);  
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public chasis(chasis: string) {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crear`, { chasis: chasis });
  }

  public inservehiculo(idchasis:any, idmotor:any, idfrontal:any, idcaja:any,  iddrive:any, idmodelo:any,idlinea:any,iddiferencial:any)  {
    let  urlServerc = this.url20;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('idchasis', idchasis); 
    body = body.set('idmotor', idmotor); 
    body = body.set('idfrontal', idfrontal); 
    body = body.set('idcaja', idcaja); 
    
    body = body.set('iddrive', iddrive); 
    body = body.set('idmodelo', idmodelo); 
    body = body.set('idlinea', idlinea); 
    body = body.set('iddiferencial', iddiferencial); 
     
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public frontal1(codigo:any)  {
    let  urlServerc = this.url16;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('frontal', codigo);  
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public frontal(frontal:any)  {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crearfrontal`, { frontal: frontal });
  }
  public diferencial1(codigo:any)  {
    let  urlServerc = this.url18;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('diferencial', codigo);  
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public diferencial(diferencial:any)  {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/creardiferencial`, { diferencial: diferencial });
  }

  public listchasis1()  {
    let  urlServerc = this.url14;
    let body = new HttpParams();
    body = body.set('op', 'select');  
     
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public listchasis()  {
    const url = `${this.baseUrl}/api/Laboratorio/chasis`;
    return this.http.get(url, { responseType: 'json' });
  }
  public listchasvehi1()  {
    let  urlServerc = this.url21;
    let body = new HttpParams();
    body = body.set('op', 'select');  
     
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public listchasvehi()  {
    const url = `${this.baseUrl}/api/Laboratorio/buscarvehiall`;
    return this.http.get(url, { responseType: 'json' });
  }
  
  
  
  public listfrontal1()  {
    let  urlServerc = this.url15;
    let body = new HttpParams();
    body = body.set('op', 'select');  
     
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }
  public listfrontal()  {
    const url = `${this.baseUrl}/api/Laboratorio/frontal`;
    return this.http.get(url, { responseType: 'json' });
  }
  public listdiferencial1()  {
    let  urlServerc = this.url17;
    let body = new HttpParams();
    body = body.set('op', 'select');  
     
       return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }
  public listdiferencial()  {
    const url = `${this.baseUrl}/api/Laboratorio/diferencial`;
    return this.http.get(url, { responseType: 'json' });
  }

  public incajas1(codigo:any )  {
    let  urlServerc = this.url12;
    let body = new HttpParams();
    body = body.set('op', 'select');  
    body = body.set('caja', codigo);  
   
    return   this.http.post( urlServerc,  body  , {responseType:'json'}  );
  }

  public incajas(caja:any )  {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crearcaja`, { caja: caja });
  }

   public inmotor(caja:any )  {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/crearmotor`, { caja: caja });
  }

   public driver(caja:any )  {
    return this.http.post<any>(`${this.baseUrl}/api/Laboratorio/creardrive`, { caja: caja });
  }



  public login1(usuario: string, password: string) {
    let urlServerc = this.url;
    
    // Crear un objeto JSON con los datos
    const body = {
      Username: usuario,
      Password: password
    };
    
    // Especificar los headers para indicar que estamos enviando JSON
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json'
      }),
      responseType: 'json' as const
    };
    
    // Realizar la solicitud POST con el objeto JSON
    return this.http.post(urlServerc, body, httpOptions);
  }



  public  login (usuario:any,password:any)  {
    let urlServerc =this.url;
    let body = new HttpParams();
   
    body = body.set('usuario',usuario);
    body = body.set('password',password);
  //  body = body.set('agencia',agencia);
    return   this.http.post( urlServerc,  body  , {responseType:'json'} );
  }
    

  public  ingrerep (imagen:any, categoria:any, vehiculo:any,codigo:any,nombre:any, descripcion:any, cantidad:any,observacion:any)  {
    let urlServerc =this.url19;
    let body = new HttpParams();
   
    body = body.set('img',imagen);
    body = body.set('cat',categoria);
    body = body.set('vehi',vehiculo);
    body = body.set('cod',codigo);
    body = body.set('nom',nombre);
    body = body.set('desc',descripcion);
    body = body.set('cant',cantidad);
    body = body.set('obser',observacion);
    
    return   this.http.post( urlServerc,  body  , {responseType:'json'} );
  }


  
}
