import Cluster from "./clusters.js";
import Marker from "./markers.js";

export default class HereQuick {

  storage_prefix = "here_";

  /**
   * Crea una nueva instancia de Here Quick
   * @param {string} apiKey api key propìa disponible en su plan de Here
   * @param {HTMLElement} mapContainer Elemento HTML donde se renderizara el mapa
   * @param {boolean} interactive true (por defecto) para indicar si se desea inicializar 
   * el mapa de forma interactiva
   */
  constructor(apiKey, mapContainer, center = false, interactive = true) {

    this.platform = new H.service.Platform({
      apikey: apiKey,
    });

    this.defaultLayers = this.platform.createDefaultLayers();

    this.map = new H.Map(mapContainer, this.defaultLayers.vector.normal.map, {
      zoom: 10,
      center: center,
      pixelRatio: window.devicePixelRatio || 1,
    });

    this.group = new H.map.Group();

    this.map.addObject(this.group);

    this.geocodeService = this.platform.getSearchService();

    this.router = this.platform.getRoutingService(null, 8);

    this.clusterLayer = false;

    if (interactive) this.setInteractive();

  }

  /**
   * Retorna la instancia "limpia" generada para el mapa renderizado
   * @returns {object} La instancia del mapa de Here
   */
  getInstance() {
    return this.map;
  }

  /**
   * Configura las propiedades basicas para hacer que el mapa interactivo y responda a eventos
   */
  setInteractive() {

    window.addEventListener("resize", () => this.map.getViewPort().resize());

    this.behavior = new H.mapevents.Behavior(
      new H.mapevents.MapEvents(this.map)
    );

    this.ui = H.ui.UI.createDefault(this.map, this.defaultLayers);

  }

  /**
   * Centra el mapa según las coordenadas especificadas
   * @param {object} coords Las coordenadas de posición (lat y lng)
   * @param {number} zoom Zoom aplicado (opcional)
   */
  move(coords, zoom = 10) {
    this.map.setCenter(coords);
    this.map.setZoom(zoom);
  }

  /**
   * Retorna las coordenadas del mapa en el lugar donde se le hizo click
   * @param {function} callback Un callback que recibe las coordenadas del punto donde se hizo click
   */
  geoClick(callback) {

    this.map.addEventListener('tap', (evt) => {

      const x = evt.currentPointer.viewportX;
      const y = evt.currentPointer.viewportY;

      const coords = this.map.screenToGeo(x, y);

      return callback(coords);

    })

  }

  /**
   * Emula el metodo geoClick pero haciendo un console.log de las coordenadas donde se hizo click
   * en lugar de retornarlas en un callback (solo para pruebas)
   */
  testGeoclicks() {

    this.map.addEventListener('tap', (evt) => {

      const x = evt.currentPointer.viewportX;
      const y = evt.currentPointer.viewportY;

      const coords = this.map.screenToGeo(x, y);

      console.log(coords);

    })


  }

  /**
   * Realiza una llamada al servicio de Geocode integrado, ver su propia documentación en:
   * https://developer.here.com/documentation/maps/3.1.30.17/dev_guide/topics/geocoding.html
   * @param {string} address El string de dirección a buscar
   * @param {function} callback Callback con la respuesta del servicio
   * @returns {object|null} La respuesta HTTP del servicio
   */
  geocode(address, callback) {
    return this.geocodeService.geocode({q: address}, response => callback(response));
  }

  /**
   *  Realiza una llamada al servicio de Geocode reverso integrado, ver su propia documentación en:
   *  https://developer.here.com/documentation/examples/maps-js/services/reverse-geocode-an-address-from-location
   * @param {object} options El objeto de coordenadas para revelar datos de la ubicacion/direccion
   * @param {function} callback Callback que recibe la respuesta del servicio
   * @returns {object|null} La respuesta HTTP del servicio
   */
  reverseGeocode(options, callback) {

    const params = {
      at: `${options.lat},${options.lng}`,
      mode: options.mode ?? 'retrieveAddresses',
      maxresults: options.maxresult ?? 1
    }

    return this.geocodeService.reverseGeocode(params, res => callback(res), (err) => console.log(err));

  }

  /**
   * Crea un nuevo marcador listo para aplicar en el mapa, ver opciónes disponibles en: 
   * https://developer.here.com/documentation/maps/3.1.30.17/dev_guide/topics/marker-objects.html
   * @param {boolean} placeInMap true para mostrar el marcador inmediatamente en el mapa
   * @param {object} options Objeto de opciones para el marcador (ver su documentación)
   * @returns {object} El ojeto del marcador creado
   */
  makeMarker(options) {

    let marker = new Marker(this, options);

    if (options.center) this.move(marker.coords, 15);

    return marker;

  }

  /**
   * Crea y retorna un nuevo objeto de icono del tipo DomIcon
   * @param {HTMLElement} element El elemento HTMl a usar commo icono de marcador
   */
  makeDomIcon(element) {
    return new H.map.DomIcon(element)
  }

  /**
   * Crea y retorna un nuevo objeto de tipo Data Point (usado en clusters)
   * @param {object} coords Un objeto con coordenadas (lat y lng)
   * @returns {DataPoint} Un objeto de tipo Data Point
   */
  makeDataPoint(options) {
    return new H.clustering.DataPoint(options.lat, options.lng, options.wt, options.data);
  }

  /**
   * Crea y retorna un nuevo objeto de tipo Cluster con los datapoints proporcionados
   * @param {DataPoint[]} datapoints Los datapoints iniciales para crear el cluster
   * @returns {Cluster} Un objeto de tipo Cluster
   */
  makeCluster(datapoints) {    
      
    let cluster = new Cluster(datapoints);

    this.clusterLayer = cluster.layer;

    this.map.addLayer(this.clusterLayer);

    return cluster;
      
  }

  /**
   * Renderiza y retorna un Circulo en el mapa
   * @param {object} options El ojeto de opciones para el circulo
   * @returns 
   */
  makeCircle(options) {

    const circle =  new H.map.Circle({lat: options.lat, lng: options.lng}, options.radius ?? 2000, {
      data: options.data,
      style: options.style
    });

    if (options.click) circle.addEventListener('tap', (evt) => options.click(circle.getData()));

    this.group.addObject(circle);

    return circle;

  }

  /**
   * Renderiza y retorna un poligono recibiendo un array de coordenadas que representan las esquinas del mismo
   * @param {object[]} coordinates Un array de objetos de tipo coordenada (lat y lng)
   * @param {object} options Un objeto de opciones para customizar el poligono
   * @returns 
   */
  makePolygon(coordinates, options = {}) {

    const lineString = new H.geo.LineString();

    coordinates.forEach(coordinate => lineString.pushPoint(coordinate));

    const polygon = new H.map.Polygon(lineString, {
      style: options.style,
      data: options.data
    });

    if (options.click) polygon.addEventListener('tap', (evt) => options.click(polygon.getData()));

    this.map.addObject(polygon);

    return polygon;

  }

  /**
   * Renderiza la vista de una ruta con marcadores de origen y destino según una seccion de ruta,
   * esta seccion de ruta esta disponible en la repsuesta del servicio de routing de Here, ver su doc aqui:
   * https://developer.here.com/documentation/maps/3.1.32.0/dev_guide/topics/routing.html
   * @param {object} routeSection La seccion de ruta
   * @param {object} options Un objeto de opciones de personalizacion para la ruta
   */
  makeRouteView(routeSection, options = {}) {

    const linestring = H.geo.LineString.fromFlexiblePolyline(routeSection.polyline);
  
    const routeLine = new H.map.Polyline(linestring, {
      style: { strokeColor: options.color ?? 'blue', lineWidth: options.lineWidth ?? 3 }
    });

    this.makeMarker(routeSection.departure.place.location).render();  // Marcador origen
    this.makeMarker(routeSection.arrival.place.location).render();    // Marcador destino

    this.group.addObject(routeLine);

    this.map.getViewModel().setLookAtData({bounds: routeLine.getBoundingBox()});

  }

  /**
   * Remueve objetos en el grupo actual del mapa
   * @param {object|array} items El objeto o los objetos a eliminar del grupo
   * @returns 
   */
  remove(items) {

      if (!Array.isArray(items)) 
        return this.group.removeObject(items.constructor.name === 'Marker' ? items.instance : items);

      items.forEach(item => {

        this.group.removeObject(item.constructor.name === 'Marker' ? item.instance : item);

      });

  }

  /**
   * Elimina y reinicia todos los objetos existentes en el mapa
   */
  restart() {

    // Remove cluster layer
    this.map.removeLayer(this.clusterLayer)

    // Restart map group
    this.map.removeObjects(this.map.getObjects());

    this.group = new H.map.Group();

    this.map.addObject(this.group);

  }

  /***** LocalStorage Utilities *****/

  checkInStorage(key) {

    if (localStorage.getItem(this.storage_prefix + key) != null) return true;

    return false;
  }

  getFromStorage(key, isJson = true) {

    if (isJson) return JSON.parse(localStorage.getItem(this.storage_prefix + key));

    return localStorage.getItem(this.storage_prefix + key);

  }

  setInStorage(key, data, returnJson = true) {

    localStorage.setItem(this.storage_prefix + key, data);

    if (returnJson) return this.getFromStorage(key);

    return this.getFromStorage(key, false);
  }

  deleteFromStorage(key) {
    localStorage.removeItem(this.storage_prefix + key);
  }

}
