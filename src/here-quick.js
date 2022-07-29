import Cluster from "./clusters.js";
import Marker from "./markers.js";

export default class HereQuick {

  storage_prefix = "here_";

  /**
   * Crea una nueva instancia de Here Quick
   * @param {string} apiKey api key propìa disponible en su plan de Here
   * @param {HTMLElement} mapContainer Elemento HTML donde se renderizara el mapa
   * @param {boolean} interactive true para indicar si se desea inicializar el mapa de forma interactiva
   */
  constructor(apiKey, mapContainer, interactive = true) {

    this.platform = new H.service.Platform({
      apikey: apiKey,
    });

    this.defaultLayers = this.platform.createDefaultLayers();

    this.map = new H.Map(mapContainer, this.defaultLayers.vector.normal.map, {
      zoom: 10,
      pixelRatio: window.devicePixelRatio || 1,
    });

    this.group = new H.map.Group();

    this.map.addObject(this.group);

    this.geoService = this.platform.getSearchService();

    this.clusterLayer = false;

    if (interactive) return this.setInteractive();

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
   * Realiza una llamada al servicio de Geocode integrado, ver su propia documentación en:
   * https://developer.here.com/documentation/maps/3.1.30.17/dev_guide/topics/geocoding.html
   * @param {string} address El string de dirección a buscar
   * @param {function} callback Callback con la respuesta del servicio
   * @returns {object|null} La respuesta HTTP del servicio
   */
  geocode(address, callback) {
    return this.geoService.geocode({q: address}, response => callback(response));
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
   * Remueve objetos en el grupo actual del mapa
   * @param {object|array} items El objeto o los objetos a eliminar del grupo
   * @returns 
   */
  remove(items) {

    if (Array.isArray(items)) return this.group.removeObjects(items);

    return this.group.removeObject(items);
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
