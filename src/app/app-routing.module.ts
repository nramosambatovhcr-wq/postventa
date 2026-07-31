import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { TutorialsListComponent } from './components/tutorials-list/tutorials-list.component';
import { TutorialDetailsComponent } from './components/tutorial-details/tutorial-details.component';
import { AddTutorialComponent } from './components/add-tutorial/add-tutorial.component';
import { ListaproveedorComponent } from './proveedor/listaproveedor/listaproveedor.component';
import { AddProveedorComponent } from './proveedor/add-proveedor/add-proveedor.component';
import { ProveedorDetailsComponent } from './proveedor/proveedor-details/proveedor-details.component';
import { ListaproductoComponent } from './productos/listaproducto/listaproducto.component';
import { ProductoDetailsComponent } from './productos/producto-details/producto-details.component';
import { AddProductoComponent } from './productos/add-producto/add-producto.component';

import { ListacategoriaComponent } from './categorias/listacategoria/listacategoria.component';
import { CategoriaDetailsComponent } from './categorias/categoria-details/categoria-details.component';
import { AddCategoriaComponent } from './categorias/add-categoria/add-categoria.component';
import { ListaimportacionesComponent } from './importaciones/listaimportaciones/listaimportaciones.component';
import { ImportacionDetailsComponent } from './importaciones/importacion-details/importacion-details.component';
import { AddImportacionComponent } from './importaciones/add-importacion/add-importacion.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ImportDetailComponent } from './import-detail/import-detail.component';
import { LoginComponent } from './login/login.component';
import { DocumentoUploadComponent } from './documento-upload/documento-upload.component';
import { ImportEditComponent } from './import-edit/import-edit.component';
import { AuthGuard } from './guards/auth.guard';
import { FechasOrdenEditComponent } from './fechas-orden-edit/fechas-orden-edit.component';
import { LiquidadoComponent } from './liquidado/liquidado.component';
import { ProcesoComponent } from './proceso/proceso.component';
import { DetalleordenComponent } from './detalleorden/detalleorden.component';
 
import { AccessDeniedComponent } from './access-denied/access-denied.component';
import { LaboratoriorevComponent } from './laboratoriorev/laboratoriorev.component';
import { LaboratorioComponent } from './laboratorio/laboratorio.component';
import { LaboratoriovehisComponent } from './laboratoriovehis/laboratoriovehis.component';
 
import { SugeridosComponent } from './sugeridos/sugeridos.component';
import { SugeridosrevComponent } from './sugeridosrev/sugeridosrev.component';
import { SugeridoserrorComponent } from './sugeridoserror/sugeridoserror.component';
import { CrearsugeridoComponent } from './crearsugerido/crearsugerido.component';
import { SugeridoexcelComponent } from './sugeridoexcel/sugeridoexcel.component';
import { SugeridosadComponent } from './sugeridosad/sugeridosad.component';
import { SugeridosaderrorComponent } from './sugeridosaderror/sugeridosaderror.component';
import { SugeridosadrevComponent } from './sugeridosadrev/sugeridosadrev.component';
import { CrearComponent } from './cotizacion/crear/crear.component';
import { DetalleComponent } from './cotizacion/detalle/detalle.component';
import { DashboardcotComponent } from './cotizacion/dashboardcot/dashboardcot.component';
import { DashboardinvoiComponent } from './invoice/dashboardinvoi/dashboardinvoi.component';
import { ExceldetalleComponent } from './cotizacion/exceldetalle/exceldetalle.component';
import { LaboratoriovehidetailComponent } from './laboratoriovehidetail/laboratoriovehidetail.component';
import { AprobadasComponent } from './cotizacion/aprobadas/aprobadas.component';
import { RechazadasComponent } from './cotizacion/rechazadas/rechazadas.component';
import { DetallescotComponent } from './cotizacion/detallescot/detallescot.component';
import { DashboardcotproComponent } from './cotizacionprov/dashboardcotpro/dashboardcotpro.component';
import { RespuestaproComponent } from './cotizacionprov/respuestapro/respuestapro.component';
import { RevisioncotComponent } from './cotizacion/revisioncot/revisioncot.component';
import { CreateInvoiceComponent } from './invoice/create-invoice/create-invoice.component';
import { DashboardbodimpComponent } from './bodegaimport/dashboardbodimp/dashboardbodimp.component';
 
import { BodegaimporenvComponent } from './bodegaimport/bodegaimporenv/bodegaimporenv.component';
import { DashboardlabComponent } from './laboratorioar/dashboardlab/dashboardlab.component';
import { SugelabcrearComponent } from './laboratorioar/sugelabcrear/sugelabcrear.component';
import { SugelabexcelComponent } from './laboratorioar/sugelabexcel/sugelabexcel.component';
 
import { SugeridoslabrevComponent } from './laboratorioar/sugeridoslabrev/sugeridoslabrev.component';
import { DashboardinvoiceComponent } from './invoice/dashboardinvoice/dashboardinvoice.component';
import { AddPedidoComponent } from './pedidous/pedidos/add-pedido/add-pedido.component';
import { ListapedidoComponent } from './pedidous/pedidos/listapedido/listapedido.component';
import { PedidoDetailsComponent } from './pedidous/pedidos/pedido-details/pedido-details.component';
import { PedidosbodComponent } from './pedidous/pedidosbod/pedidosbod.component';
import { PedidosbodasigComponent } from './pedidous/pedidosbodasig/pedidosbodasig.component';
import { PedidosboderrorComponent } from './pedidous/pedidosboderror/pedidosboderror.component';
import { PedidosbodproceComponent } from './pedidous/pedidosbodproce/pedidosbodproce.component';
import { PedidosbodrevComponent } from './pedidous/pedidosbodrev/pedidosbodrev.component';
import { PedidoExcelComponent } from './pedidovhcr/pedido-excel/pedido-excel.component';
import { PedidoIndividualComponent } from './pedidovhcr/pedido-individual/pedido-individual.component';
import { PedidobodComponent } from './pedidovhcr/pedidobod/pedidobod.component';
import { PedidobodasigComponent } from './pedidovhcr/pedidobodasig/pedidobodasig.component';
import { PedidoboderrorComponent } from './pedidovhcr/pedidoboderror/pedidoboderror.component';
import { PedidobodproComponent } from './pedidovhcr/pedidobodpro/pedidobodpro.component';
import { PedidobodrevComponent } from './pedidovhcr/pedidobodrev/pedidobodrev.component';
import { DashboardblComponent } from './bl/dashboardbl/dashboardbl.component';
import { BlCreateComponent } from './bl/bl-create/bl-create.component';
import { BlInvoiceexcelComponent } from './bl/bl-invoiceexcel/bl-invoiceexcel.component';
import { BlInvoiceComponent } from './bl/bl-invoice/bl-invoice.component';
import { BlInvoicebldetailComponent } from './bl/bl-invoicebldetail/bl-invoicebldetail.component';
import { OilListComponent } from './pedidovhcr/oil/oil-list/oil-list.component';
import { OilCreateComponent } from './pedidovhcr/oil/oil-create/oil-create.component';
import { OiluslistComponent } from './pedidous/oil/oiluslist/oiluslist.component';
import { OiluspedComponent } from './pedidous/oil/oilusped/oilusped.component';
import { FilterCreateComponent } from './pedidovhcr/oil/filter-create/filter-create.component';
import { InsumoCreateComponent } from './pedidovhcr/oil/insumo-create/insumo-create.component';
import { FilteruslistComponent } from './pedidous/filter/filteruslist/filteruslist.component';
import { FilteruspedComponent } from './pedidous/filter/filterusped/filterusped.component';
import { InsumouslistComponent } from './pedidous/insumos/insumouslist/insumouslist.component';
import { InsumouspedComponent } from './pedidous/insumos/insumousped/insumousped.component';
import { FilterListComponent } from './pedidovhcr/oil/filter-list/filter-list.component';
import { InsumoListComponent } from './pedidovhcr/oil/insumo-list/insumo-list.component';
import { DashboardprovpedComponent } from './proveedoroil/dashboardprovped/dashboardprovped.component';
import { OilListenvComponent } from './pedidovhcr/oil/oil-listenv/oil-listenv.component';
import { FilterListenvComponent } from './pedidovhcr/oil/filter-listenv/filter-listenv.component';
import { InsumoListenvComponent } from './pedidovhcr/oil/insumo-listenv/insumo-listenv.component';
import { SearchDashboardComponent } from './search-dashboard/search-dashboard.component';
import { FechasBLEditComponent } from './fechas-bl-edit/fechas-bl-edit.component';
import { DashboardbodblComponent } from './bodegaimport/dashboardbodbl/dashboardbodbl.component';
import { OtgarantiaComponent } from './laboratorioar/otgarantia/otgarantia.component';
import { ConteoComponent } from './bodegaimport/conteo/conteo.component';
import { RevisionblComponent } from './bodegaimport/revisionbl/revisionbl.component';
import { PedidopdiComponent } from './pedidopdius/pedidopdi/pedidopdi.component';
import { PedidopdibodComponent } from './pedidopdibod/pedidopdibod/pedidopdibod.component';
import { PedidopdicreateComponent } from './pedidopdius/pedidopdicreate/pedidopdicreate.component';
import { PedidopdiexcelComponent } from './pedidopdius/pedidopdiexcel/pedidopdiexcel.component';
import { DashboardtaskComponent } from './taskflow/dashboardtask/dashboardtask.component';
import { PedidotallerComponent } from './taller/pedidotaller/pedidotaller.component';
import { CreatepedidoComponent } from './taller/createpedido/createpedido.component';
import { CreatepedidoexcelComponent } from './taller/createpedidoexcel/createpedidoexcel.component';
import { BlvhcrComponent } from './importacionesdep/blvhcr/blvhcr.component';
import { BlvhcrupdateComponent } from './importacionesdep/blvhcrupdate/blvhcrupdate.component';
import { BlvhcrdetailComponent } from './importacionesdep/blvhcrdetail/blvhcrdetail.component';
import { InvoiceproComponent } from './cotizacionprov/invoicepro/invoicepro.component';
import { BlproComponent } from './cotizacionprov/blpro/blpro.component';
import { BlprocreateComponent } from './cotizacionprov/blprocreate/blprocreate.component';
import { BlprocreateexcelComponent } from './cotizacionprov/blprocreateexcel/blprocreateexcel.component';
import { BlprodetailComponent } from './cotizacionprov/blprodetail/blprodetail.component';
import { BlvhcrinvoiceComponent } from './importacionesdep/blvhcrinvoice/blvhcrinvoice.component';
import { DashboardrevComponent } from './invoice/dashboardrev/dashboardrev.component';
import { ArchivosblComponent } from './cotizacionprov/archivosbl/archivosbl.component';
import { BlusComponent } from './pedidous/blus/blus.component';
import { BlpedusComponent } from './pedidous/blpedus/blpedus.component';
import { RevisionComponent } from './bodegaimport/revision/revision.component';
import { RevblupdateComponent } from './bodegaimport/revblupdate/revblupdate.component';
import { BodegaComponent } from './bodegaimport/bodega/bodega.component';
import { RecepcionComponent } from './procesos/recepcion/recepcion.component';
import { TransferenciasComponent } from './bodegaimport/transferencias/transferencias.component';
import { SoportesComponent } from './laboratorioar/soportes/soportes.component';
import { SlaboratorioComponent } from './pedidous/slaboratorio/slaboratorio.component';
import { FaltantesinComponent } from './invoice/faltantesin/faltantesin.component';
import { AgendamientosComponent } from './procesoscli/agendamientos/agendamientos.component';
import { AgendaComponent } from './procesos/agenda/agenda.component';
import { InvconteoComponent } from './inventarios/invconteo/invconteo.component';
import { InvbodageComponent } from './inventarios/invbodage/invbodage.component';
import { ClocalComponent } from './pedidovhcr/clocal/clocal.component';
import { ReservadosComponent } from './inventarios/reservados/reservados.component';
import { RankingComponent } from './inventarios/ranking/ranking.component';
import { ConteoallagenComponent } from './inventarios/conteoallagen/conteoallagen.component';
import { ReconteoComponent } from './inventarios/reconteo/reconteo.component';
import { Conteo2Component } from './inventarios/conteo2/conteo2.component';
import { AlldaysComponent } from './inventarios/alldays/alldays.component';
import { RespuestacotComponent } from './cotizacion/respuestacot/respuestacot.component';
import { ConteoallComponent } from './inventarios/conteoall/conteoall.component';
import { ConteoglobalComponent } from './inventarios/conteoglobal/conteoglobal.component';
import { OtgrtComponent } from './garantias/otgrt/otgrt.component';
import { CompralocalesComponent } from './compras/compralocales/compralocales.component';
import { AccesoinvComponent } from './inventarios/accesoinv/accesoinv.component';
import { Alldays1Component } from './inventarios/alldays1/alldays1.component';
import { AdminsolicitudespermisoComponent } from './pedidovhcr/adminsolicitudespermiso/adminsolicitudespermiso.component';
import { VidriosCreateComponent } from './pedidovhcr/oil/vidrios-create/vidrios-create.component';
import { VidriosListComponent } from './pedidovhcr/oil/vidrios-list/vidrios-list.component';
import { VidriosListenvComponent } from './pedidovhcr/oil/vidrios-listenv/vidrios-listenv.component';
import { VidrioslistComponent } from './pedidous/vidrios/vidrioslist/vidrioslist.component';
import { VidriosuspedComponent } from './pedidous/vidrios/vidriosusped/vidriosusped.component';
import { CrearMultipleComponent } from './cotizacion/crear-multiple/crear-multiple.component';
import { ExceldetalleMultipleComponent } from './cotizacion/exceldetalle-multiple/exceldetalle-multiple.component';
import { ConsolidarCotizacionComponent } from './cotizacion/consolidar-cotizacion/consolidar-cotizacion.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { BitacoraComponent } from './agendas/bitacora/bitacora.component';
import { RepotenciacionCajasComponent } from './laboratorioar/repotenciacion-cajas/repotenciacion-cajas.component';
import { Alldays2Component } from './inventarios/alldays2/alldays2.component';
import { CotasignadaComponent } from './cotizacionprov/cotasignada/cotasignada.component';
import { AsignadacotComponent } from './cotizacion/asignadacot/asignadacot.component';
import { CrearinvoiproComponent } from './cotizacionprov/crearinvoipro/crearinvoipro.component';
import { InvoproasignadaComponent } from './cotizacionprov/invoproasignada/invoproasignada.component';
import { EquivalentesComponent } from './repuestos/equivalentes/equivalentes.component';
import { ExtraccionvehiComponent } from './laboratorioar/extraccionvehi/extraccionvehi.component';
import { ExtraccionbodComponent } from './laboratorioar/extraccionbod/extraccionbod.component';
import { AsignacionvehiComponent } from './laboratorioar/asignacionvehi/asignacionvehi.component';
import { InspeccionarrivosComponent } from './bodegaimport/inspeccionarrivos/inspeccionarrivos.component';
import { InspeccionblarrivoComponent } from './bodegaimport/inspeccionblarrivo/inspeccionblarrivo.component';
import { PaqtanaComponent } from './pedidosvhcr/paqtana/paqtana.component';
import { InventariopaqComponent } from './pedidosvhcr/inventariopaq/inventariopaq.component';
import { VentaspaqComponent } from './pedidosvhcr/ventaspaq/ventaspaq.component';
import { AgenciasbodComponent } from './bodegaimport/agenciasbod/agenciasbod.component';
import { RevisionrepuestosComponent } from './bodegaimport/revisionrepuestos/revisionrepuestos.component';
import { JacComponent } from './bodegaimport/jac/jac.component';
import { FawComponent } from './bodegaimport/faw/faw.component';
import { AnalisisbodagComponent } from './bodegaimport/analisisbodag/analisisbodag.component';
import { InvoicevehiComponent } from './vehiculos/invoicevehi/invoicevehi.component';
import { BlvehiComponent } from './vehiculos/blvehi/blvehi.component';
import { OtgrtresumenComponent } from './garantias/otgrtresumen/otgrtresumen.component';
import { ChecklistEnsamblajeComponent } from './vehiculos/checklist-ensamblaje/checklist-ensamblaje.component';
import { RecepcionplantaensamComponent } from './vehiculos/recepcionplantaensam/recepcionplantaensam.component';
import { CompraslocalesComponent } from './compras/compraslocales/compraslocales.component';
import { PedidobodSearchModalComponent } from './pedidovhcr/pedidobod-search-modal/pedidobod-search-modal.component';
import { BlvehiRevisionComponent } from './vehiculos/blvehi-revision/blvehi-revision.component';
import { ChecklistPdiComponent } from './vehiculos/checklist-pdi/checklist-pdi.component';
import { RepotenciacionCajasService } from './services/repotenciacion-cajas.service';
import { RepotenciacionagComponent } from './pedidous/repotenciacionag/repotenciacionag.component';
import { DashboardvehiComponent } from './vehiculos/dashboardvehi/dashboardvehi.component';
import { InicioDashboardComponent } from './inventarios/inicio-dashboard/inicio-dashboard.component';
import { InvdashboardComponent } from './inventarios/invdashboard/invdashboard.component';
import { InvusuariosComponent } from './inventarios/invusuarios/invusuarios.component';
import { SincronizacionComponent } from './inventarios/sincronizacion/sincronizacion.component';
import { ReportevehiculosComponent } from './laboratorioar/reportevehiculos/reportevehiculos.component';
import { InvoicePaqtanaComponent } from './invoice/invoice-paqtana/invoice-paqtana.component';
import { Alldays3Component } from './inventarios/alldays3/alldays3.component';
import { ClasificacionComponent } from './abastecimiento/clasificacion/clasificacion.component';
import { ForecastComponent } from './abastecimiento/forecast/forecast.component';
import { RotacionComponent } from './abastecimiento/rotacion/rotacion.component';
import { TransitoComponent } from './abastecimiento/transito/transito.component';
import { OtgrtfactComponent } from './garantias/otgrtfact/otgrtfact.component';
import { OtgrtfactdetalleComponent } from './garantias/otgrtfactdetalle/otgrtfactdetalle.component';
import { OtgrtskusComponent } from './garantias/otgrtskus/otgrtskus.component';
import { ConjuntosarmadosComponent } from './bodegaimport/conjuntosarmados/conjuntosarmados.component';
import { PedidobodunifComponent } from './pedidovhcr/pedidobodunif/pedidobodunif.component';
import { GarantiasTecnicoComponent } from './garantiasvhcr/garantias-tecnico/garantias-tecnico.component';
import { GarantiasJefeComponent } from './garantiasvhcr/garantias-jefe/garantias-jefe.component';
import { GarantiasEncargadoComponent } from './garantiasvhcr/garantias-encargado/garantias-encargado.component';
import { AgenciasvhcrComponent } from './garantiasvhcr/agenciasvhcr/agenciasvhcr.component';
import { RepuestosDanadosComponent } from './pedidous/repuestos-danados/repuestos-danados.component';
import { RepuestosdnadosclaseComponent } from './pedidovhcr/repuestosdnadosclase/repuestosdnadosclase.component';
import { EcommerceComponent } from './pedidous/ecommerce/ecommerce.component';
import { CrearOrdenCompletaComponent } from './invoice/crear-orden-completa/crear-orden-completa.component';
import { BldetalleComponent } from './bl/bldetalle/bldetalle.component';
import { OtautComponent } from './garantias/otaut/otaut.component';
import { OtautdetalleComponent } from './garantias/otautdetalle/otautdetalle.component';
import { MaestropartesComponent } from './abastecimiento/maestropartes/maestropartes.component';
import { HistorialbajasComponent } from './invoice/historialbajas/historialbajas.component';
import { ExtraccionImagenesComponent } from './laboratorioar/extraccion-imagenes/extraccion-imagenes.component';
import { TransitovehiComponent } from './vehiculos/transitovehi/transitovehi.component';
import { CampanasComponent } from './inventarios/campanas/campanas.component';
import { InvusuarioComponent } from './inventarios/invusuario/invusuario.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' }, // Cambiado de 'login' a 'dashboard'
  { path: 'login', component: LoginComponent },
  { path: 'acceso-denegado', component: AccessDeniedComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','usuario','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2','paqtana'] }  },
  { path: 'searchdashboard', component: SearchDashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','usuario','laboratorio1','laboratorio2'] }  },
  { path: 'equivalentes', component: EquivalentesComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2','paqtana'] }  },
  


  { path: 'admindashboard', component: AdminDashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin']}  },
  
{ path: 'bitacora', component: BitacoraComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','usuario','laboratorio1','laboratorio2','laboratorio3'] }  },
  // Rutas protegidas solo para admin
  { path: 'tutorials', component: TutorialsListComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'tutorials/:id', component: TutorialDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'add', component: AddTutorialComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'proveedor', component: ListaproveedorComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'proveedor/:id', component: ProveedorDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'addprov', component: AddProveedorComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'producto', component: ListaproductoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','paqtana'] } },
  { path: 'producto/:id', component: ProductoDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'addprod', component: AddProductoComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'pedido', component: ListapedidoComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'pedido/:id', component: PedidoDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'addped', component: AddPedidoComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'categoria', component: ListacategoriaComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'categoria/:id', component: CategoriaDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'addcat', component: AddCategoriaComponent, canActivate: [AuthGuard], data: { roles: ['admin'] } },
  { path: 'importacion', component: ListaimportacionesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'importacion/:id', component: ImportacionDetailsComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'addimpor', component: AddImportacionComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos']} },
  
  // Rutas para admin y usuario
  { path: 'details/:proformaId', component: ImportDetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario'] } },
  { path: 'docu', component: DocumentoUploadComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario'] } },
  { path: 'details/:proformaId/edit/:proformaId', component: ImportEditComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario'] } },
  { path: 'details/:id/seguimiento/:proformaId', component: FechasOrdenEditComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario'] } },
  { path: 'detailsbl/:id', component: FechasBLEditComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario','repuestoslv','repuestoslk','repuestoslsc'] } },
  
  { path: 'liquidado', component: LiquidadoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'usuario', 'laboratorio1','laboratorio2'] } },
  { path: 'proceso', component: ProcesoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'usuario'] } },
  { path: 'detalle/:ordenId', component: DetalleordenComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'usuario'] } },
  { path: 'pedidobod', component: PedidobodComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
 { path: 'clocal', component: ClocalComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
 
{ path: 'pedidobodunif', component: PedidobodunifComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
 

  { path: 'pedidobodrev', component: PedidobodrevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
  { path: 'pedidobodpro', component: PedidobodproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2']} },
  { path: 'pedidobodasig', component: PedidobodasigComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
   { path: 'pedidoboderror', component: PedidoboderrorComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2'] } },
  { path: 'laboratoriorev', component: LaboratoriorevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'laboratorio','laboratorio1','laboratorio2','laboratorio3', 'bodegaimpor','repuestoslk','repuestoslsc'] } },
  { path: 'laboratorio', component: LaboratorioComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','laboratorio','laboratorio1','laboratorio2','laboratorio3','repuestoslv', 'bodegaimpor','repuestoslk','repuestoslsc'] } },
  { path: 'laboratoriovehi', component: LaboratoriovehisComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', 'laboratorio','laboratorio1','laboratorio2','laboratorio3','repuestoslv', 'bodegaimpor','repuestoslk','repuestoslsc'] } },
  { path: 'laboratoriovehidetail', component: LaboratoriovehidetailComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', 'laboratorio','laboratorio1','laboratorio2','laboratorio3','repuestoslv', 'bodegaimpor','repuestoslk','repuestoslsc'] } },
  { path: 'laboratoriovehidetail/:id', component: LaboratoriovehidetailComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', 'laboratorio','laboratorio1','laboratorio2','laboratorio3','repuestoslv', 'bodegaimpor','repuestoslk','repuestoslsc'] } },
  { path: 'labots', component: OtgarantiaComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', 'laboratorio','laboratorio1','laboratorio2','laboratorio3'] } },
 

  { path: 'oil', component: OilCreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'oillist', component: OilListComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'oillistenv', component: OilListenvComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'vidrios', component: VidriosCreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'vidrioslist', component: VidriosListComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'vidrioslistenv', component: VidriosListenvComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'filter', component: FilterCreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'insumo', component: InsumoCreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'filterlist', component: FilterListComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'insumolist', component: InsumoListComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'filterlistenv', component: FilterListenvComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'insumolistenv', component: InsumoListenvComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
  { path: 'permisopedido', component: AdminsolicitudespermisoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 
  
  { path: 'businv', component: PedidobodSearchModalComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2','paqtana'] } },


  { path: 'pedidosbod', component: PedidosbodComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'pedidosbodrev', component: PedidosbodrevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor'] } },
  { path: 'pedidosbodasig', component: PedidosbodasigComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor'] } },  
  { path: 'pedidosbodproce', component: PedidosbodproceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor'] } },  
  { path: 'pedidosboderror', component: PedidosboderrorComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor'] } },
  { path: 'pedidosbodinser', component: PedidoIndividualComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor' ,'taller'] } },
  { path: 'pedidosbodexcel', component: PedidoExcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor' , 'taller'] } },
  { path: 'sugeridos', component: SugeridosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'sugeridosrev', component: SugeridosrevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'sugeridoserror', component: SugeridoserrorComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'crearsugeridos', component: CrearsugeridoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'sugeridosexcel', component: SugeridoexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },
  { path: 'sugeridosad', component: SugeridosadComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2'] } },
  { path: 'sugeridosadrev', component: SugeridosadrevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2'] } },
  { path: 'sugeridosaderror', component: SugeridosaderrorComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2'] } },
  { path: 'soporteslab', component: SoportesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2','laboratorio3'] } },
  { path: 'danados', component: RepuestosDanadosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2', 'bodegaimpor1'] } },
  { path: 'danadosclase', component: RepuestosdnadosclaseComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2','laboratorio3'] } },
  { path: 'ecommerce', component: EcommerceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2','bodegaimpor1','bodegaimpor3'] } },
 


  { path: 'soporteslab', component: SoportesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','laboratorio2','laboratorio3'] } },
   { path: 'soporteslabo', component: SlaboratorioComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegaimpor1'] } },
  { path: 'repotenciacion', component: RepotenciacionCajasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2','laboratorio3','garantias']  } },
 { path: 'repotenciacionag', component: RepotenciacionagComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped','bodegapdi1', 'bodegaimpor','bodegapdi2'] } },

  { path: 'extraccionvehi', component: ExtraccionvehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2','laboratorio3']  } },
  { path: 'extraccionbod', component: ExtraccionbodComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2','laboratorio3', 'bodegaimpor', 'bodegaimpor1']  } },
  { path: 'asignarvehi', component: AsignacionvehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','laboratorio1','laboratorio2','laboratorio3']  } },
  { path: 'reportevehis', component: ReportevehiculosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio1','laboratorio2','laboratorio3']  } },
  { path: 'extraccionimagenes', component: ExtraccionImagenesComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','repuestoslv','repuestoslk','repuestoslsc','laboratorio2','laboratorio3']  } },
  

  { path: 'oiluslist', component: OiluslistComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
  { path: 'oiluscreate', component: OiluspedComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
 
  { path: 'filteruslist', component: FilteruslistComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
  { path: 'filteruscreate', component: FilteruspedComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
 
  { path: 'insumouslist', component: InsumouslistComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
  { path: 'insumouscreate', component: InsumouspedComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
 
  { path: 'vidriouslist', component: VidrioslistComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
  { path: 'vidriouscreate', component: VidriosuspedComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
 
  { path: 'blus', component: BlusComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
//  { path: 'blpedus', component: BlpedusComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor'] } },
  { path: 'blpedidous/:id', component: BlpedusComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodega','bodegaped', 'bodegaimpor','bodegapdi1'] } },
  

  { path: 'crearcot', component: CrearComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv','repuestoslk', 'repuestoslsc'] } },
  { path: 'crearcotmult', component: CrearMultipleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv','repuestoslk', 'repuestoslsc'] } },
  { path: 'detallexcelcotmult', component: ExceldetalleMultipleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv','repuestoslk', 'repuestoslsc'] } },
 { path: 'consolidar/:cotigeneralId', component: ConsolidarCotizacionComponent , canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv','repuestoslk', 'repuestoslsc'] } },
  { path: 'detallecot', component: DetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'dashboardcot', component: DashboardcotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'detallexcelcot', component: ExceldetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'detallexcelcot/:id', component: ExceldetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'cotaprobada', component: AprobadasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc', 'proveedor'] } },
  { path: 'cotrechazada', component: RechazadasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'detallescot', component: DetallescotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'detallescot/:id', component: DetallescotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'revisioncot', component: RevisioncotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'revisioncot/:id', component: RevisioncotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'respuestacot/:id', component: RespuestacotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 { path: 'asignadacot', component: AsignadacotComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 
  //asignadacot
  { path: 'dashboardinvoi', component: DashboardinvoiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
  { path: 'crearinvoi', component: CreateInvoiceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 { path: 'crear-orden-completa', component: CrearOrdenCompletaComponent , canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },

  //DashboardinvoiceComponent
  { path: 'detailinvoi', component: DashboardinvoiceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv','repuestoslk', 'repuestoslsc', 'paqtana'] } },
  { path: 'detailinvoi/:id', component: DashboardinvoiceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc', 'paqtana'] } },
  { path: 'dashinvorev/:id', component: DashboardrevComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc', 'proveedor', 'paqtana'] } },
  { path: 'faltantesin', component: FaltantesinComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
{ path: 'historialbajas', component: HistorialbajasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },

   { path: 'invoice-paqtana', component: InvoicePaqtanaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc','paqtana'] } },
  


  { path: 'dashboardbl', component: DashboardblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'laboratorio2', 'repuestoslsc', 'paqtana'] } },
  { path: 'dashboardblcreate', component: BlCreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'repuestoslsc'] } },
  { path: 'dashboardblexcel', component: BlInvoiceexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'repuestoslsc'] } },
  { path: 'dashboardblexcel/:id', component: BlInvoiceexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'repuestoslsc'] } },
   { path: 'dashboardblinvoice', component: BlInvoiceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc', 'repuestoslsc'] } },
   { path: 'dashboardbldetail/:id', component: BlInvoicebldetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'bodegaimpor', 'repuestoslsc'] } },  
  { path: 'bldetalle', component: BldetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'laboratorio2', 'repuestoslsc', 'paqtana'] } },
 { path: 'bldetalle/:id', component: BldetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'importaciones', 'laboratorio2', 'repuestoslsc', 'paqtana'] } },
 

 //asignadacot
  { path: 'gestioninv', component: PaqtanaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 { path: 'invenpaq', component: InventariopaqComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 { path: 'ventaspaq', component: VentaspaqComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'repuestoslv', 'repuestoslk', 'repuestoslsc'] } },
 


  { path: 'dashboardcotpro', component: DashboardcotproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
  { path: 'respuestapro', component: RespuestaproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
  { path: 'respuestapro/:id', component: RespuestaproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
   { path: 'archivosbl', component: ArchivosblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
   { path: 'archivosbl/:id', component: ArchivosblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
    { path: 'cotasignada', component: CotasignadaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
   { path: 'crearinvoipro', component: CrearinvoiproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
 { path: 'invoproasig', component: InvoproasignadaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'proveedor'] } },
 

  { path: 'dashboardbodimp', component: DashboardbodimpComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
  { path: 'dashboardblbod', component: DashboardbodblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },  
  { path: 'dashboardbodenvia', component: BodegaimporenvComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor'] } },
  { path: 'dashboardconteo', component: ConteoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'dashboardconteo/:id', component: ConteoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'dashboardblrevision', component: RevisionblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'dashboardblrevision/:id', component: RevisionblComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'blrevupdate', component: RevblupdateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'blrevupdate/:id', component: RevblupdateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'blrevision', component: RevisionComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'bodega', component: BodegaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'transferencias', component: TransferenciasComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'inspecarrivo', component: InspeccionarrivosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor2'] } },
  { path: 'inspecblarrivo', component: InspeccionblarrivoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
  { path: 'agenciabod', component: AgenciasbodComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor3'] } },
  { path: 'revisionpartes', component: RevisionrepuestosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor3'] } },
  { path: 'revisionpartes/:id', component: RevisionrepuestosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1', 'bodegaimpor3'] } },
  { path: 'jac', component: JacComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
  { path: 'faw', component: FawComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
  { path: 'analisisbodag', component: AnalisisbodagComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
  { path: 'analisisbodag/:id', component: AnalisisbodagComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },
   { path: 'conjuntosarmados', component: ConjuntosarmadosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'bodegaimpor', 'bodegaimpor1'] } },



  //VEHICULOS

  { path: 'invoicevehi', component: InvoicevehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'blvehi', component: BlvehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
    { path: 'blvehi/:id', component: BlvehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'emsamblajevehi', component: ChecklistEnsamblajeComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'recepcionvehiplanta', component: RecepcionplantaensamComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'revisionblvehi', component: BlvehiRevisionComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
   { path: 'revisionblvehi/:id', component: BlvehiRevisionComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'revpdi', component: ChecklistPdiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'vehidash', component: DashboardvehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  { path: 'transitovehi', component: TransitovehiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo'] } },
  
  //GARANTIAS
  { path: 'tecnico', component: GarantiasTecnicoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo', 'tecnico'] } },
  { path: 'jefe', component: GarantiasJefeComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo', 'jefe'] } },
   { path: 'encargado', component: GarantiasEncargadoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo', 'encargado'] } },
   { path: 'encargado/:id', component: GarantiasEncargadoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo', 'encargado'] } },
   { path: 'agenvhcr', component: AgenciasvhcrComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'vehiculo', 'encargado'] } },


  //RevblupdateComponent

  { path: 'dashboardsugelab', component: DashboardlabComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'laboratorio1','laboratorio2','repuestos'] } },
  { path: 'sugelabcrear', component: SugelabcrearComponent, canActivate: [AuthGuard], data: { roles: ['admin','laboratorio2', 'laboratorio1'] } },
  { path: 'sugelabexcel', component: SugelabexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin','laboratorio2', 'laboratorio1'] } },
  { path: 'sugeridoslabrev', component: SugeridoslabrevComponent, canActivate: [AuthGuard], data: { roles: ['admin','laboratorio2', 'laboratorio1'] } },

  { path: 'dashboardpedidos', component: DashboardprovpedComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedoroil'] } },

 { path: 'dashboardpedidospdius', component: PedidopdiComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','bodegapdi','bodegapdi2'] } },
 { path: 'pedidospdiuscreate', component: PedidopdicreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','bodegapdi','bodegapdi2'] } },
 
 
 { path: 'dashboardpedidospdibod', component: PedidopdibodComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','bodegapdi1'] } },
{ path: 'excel', component: PedidopdiexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','bodegapdi1'] } },

//pedidospdiuscreate

{ path: 'taskflow', component: DashboardtaskComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos'] } },
{ path: 'dashboardtaller', component: PedidotallerComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos' , 'taller'] } },
{ path: 'pedidotaller', component: CreatepedidoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos' ,'taller'] } },
{ path: 'pedidotallerexcel', component: CreatepedidoexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos', 'taller'] } },

//importacionvhcr BlvhcrComponent
  { path: 'dashboardblVhcr', component: BlvhcrComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },
  { path: 'blvhcrupdate', component: BlvhcrupdateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },
  { path: 'blvhcrupdate/:id', component: BlvhcrupdateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },
  { path: 'blvhcrdetail', component: BlvhcrdetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },
  { path: 'blvhcrdetail/:id', component: BlvhcrdetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },
  { path: 'blvhcrinvo/:id', component: BlvhcrinvoiceComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','importaciones'] } },


  { path: 'invoicepro', component: InvoiceproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
  { path: 'blpro', component: BlproComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
  { path: 'blprocreate', component: BlprocreateComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
  { path: 'blprocreateexcel', component: BlprocreateexcelComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
  { path: 'blprodetail', component: BlprodetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
  { path: 'blprodetail/:id', component: BlprodetailComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'repuestos','proveedor'] } },
 
  //BlvhcrinvoiceComponent
  
   { path: 'dashboardprocesos', component: RecepcionComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'procesos'] } },
   { path: 'dashboardagendamientos', component: AgendamientosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'procesos'] } },
   { path: 'dashboardagenda', component: AgendaComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'procesos1'] } },

   { path: 'dashboardinv', component: InvconteoComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventario', 'inventarioad'] } },
   { path: 'invbodage', component: InvbodageComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventario', 'inventarioad'] } },
   { path: 'invbodage/:id', component: InvbodageComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventario', 'inventarioad'] } },     
   { path: 'reservados', component: ReservadosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventarioad'] } },   
   { path: 'reservados/:id', component: ReservadosComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventarioad'] } },     
   { path: 'ranking/:id', component: RankingComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventarioad'] } },  
   { path: 'resrevados/:id', component: InvbodageComponent, canActivate: [AuthGuard], data: { roles: ['admin', 'inventarioad'] } },
   { path: 'conteoallagen/:id', component: ConteoallagenComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'reconteo/:id', component: ReconteoComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'conteo2/:id', component: Conteo2Component, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'alldays/:id', component: AlldaysComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'alldays1/:id', component: Alldays1Component, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'alldays2/:id', component: Alldays2Component, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
   { path: 'alldays3/:id', component: Alldays3Component, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
   

    { path: 'conteoall/:id', component: ConteoallComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'conteoglobal/:id', component: ConteoglobalComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'accesoinv/:id', component: AccesoinvComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
   { path: 'iniciodash', component: InicioDashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },

{
  path: 'invdash',
  component: InvdashboardComponent,
  canActivate: [AuthGuard],
  data: { roles: ['admin', 'inventario', 'inventarioad'] },
  children: [
    { path: 'sincronizacion', component: SincronizacionComponent },
    { path: 'campanas', component: CampanasComponent } ,
     { path: 'invusuario', component: InvusuarioComponent } 
  ]
},
   
//   { path: 'invdash', component: InvdashboardComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
    { path: 'invusuarios', component: InvusuariosComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },
//{ path: 'sincronizacion', component: SincronizacionComponent, canActivate: [AuthGuard], data: { roles: ['admin','inventario', 'inventarioad'] } },




  { path: 'otgrt', component: OtgrtComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
  { path: 'otgrtresumen', component: OtgrtresumenComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2', 'gerencia','talleres'] } },
  { path: 'otgrtfact', component: OtgrtfactComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
  { path: 'otgrtfactdetalle', component: OtgrtfactdetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
 { path: 'otgrtskus', component: OtgrtskusComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
  { path: 'otaut', component: OtautComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
  { path: 'otautresumen', component: OtautdetalleComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos','laboratorio1', 'laboratorio2'] } },
    

  { path: 'compraslc', component: CompraslocalesComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },

 { path: 'clasificacion', component: ClasificacionComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },
 { path: 'forecast', component: ForecastComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },
 { path: 'rotacion', component: RotacionComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },
 { path: 'transito', component: TransitoComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },
 { path: 'maestropartes', component: MaestropartesComponent, canActivate: [AuthGuard], data: { roles: ['admin','repuestos', ] } },





];

@NgModule({
  imports: [RouterModule.forRoot(routes, { useHash: true })],
  exports: [RouterModule]
})
export class AppRoutingModule { }