export default class HereQuick {

  /**
   * Crea una nueva instancia de Here Quick
   * @param {string} apiKey api key propìa para el uso de Here
   * @param {HTMLElement} mapContainer Elemento HTML donde se renderizara el mapa
   */
  constructor(apiKey, mapContainer) {

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

  }

  storage_prefix = "here_";

  /**
   * Retorna la instancia "limpia" generada para el mapa renderizado
   * @returns {object} La instancia del mapa de Here
   */
  getInstance() {
    return this.map;
  }

  /**
   * Configura las propiedades basicas para hacer el mapa interactivo
   */
  setInteractive() {

    window.addEventListener("resize", () => this.map.getViewPort().resize());

    this.behavior = new H.mapevents.Behavior(
      new H.mapevents.MapEvents(this.map)
    );

    this.ui = H.ui.UI.createDefault(this.map, this.defaultLayers);

    this.initMarkers();

  }

  initMarkers() {

    this.group.addEventListener("tap", (evt) => {

        var markerData = evt.target.getData();

        if (markerData.bubbleData) {

          var bubble = new H.ui.InfoBubble(evt.target.getGeometry(), {
            content: markerData.bubbleData,
          });

          this.ui.addBubble(bubble);

          if (markerData.bubbleEvent) {

            bubble.getElement().addEventListener(
                markerData.bubbleEvent.type,
                markerData.bubbleEvent.callback
              );
          }
        }
      },
      false
    );
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

    const coords = {lat: options.lat, lng: options.lng};

    if (options.icon) {

      var marker = new H.map.DomMarker(coords, {
        icon: new H.map.DomIcon(options.icon),
      });

    } else var marker = new H.map.Marker(coords);

    marker.setData({
      bubbleData: options.bubbleData ? options.bubbleData : null,
      bubbleEvent: options.bubbleEvent ? options.bubbleEvent : null,
    });

    if (!options.render || options.render != false) this.group.addObject(marker);;
    
    return marker;

  }

  /**
   * Crea y retorna un nuevo objeto de icono, especialmente para marcadores
   * @param {string} icon El icono puede generarse a partir de 
   * un formato SVG o una URL de imagen local o remota 
   * @returns {object} Un objeto de tipo icono
   */
  makeIcon(icon) {
    return new H.map.Icon(icon);
  }

  /**
   * Crea y retorna un nuevo objeto de icono del tipo DomIcon
   * @param {HTMLElement} element El elemento HTMl a usar commo icono de marcador
   */
  makeDomIcon(element) {
    return new H.map.DomIcon(element)
  }

  makeClusters(geoPoints,themeOptions = false) {

    const ui = this.ui;

    var dataPoints = geoPoints.map(
      (point) => new H.clustering.DataPoint(point.lat, point.lng, null, point)
    );

    var clusteredDataProvider = new H.clustering.Provider(dataPoints, {
      clusteringOptions: {
        eps: 64,
        minWeight: 3,
      },
    });

    if (themeOptions) {

      var defaultTheme = clusteredDataProvider.getTheme();

      if (themeOptions.theme == 'retreats') {

        new retreatsTheme(
          ui,clusteredDataProvider,defaultTheme,themeOptions
        );

      }

    }

    this.clusterLayer = new H.map.layer.ObjectLayer(clusteredDataProvider);

    this.map.addLayer(this.clusterLayer);
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

    this.initMarkers();
  }

  /***** LocalStorage Utilities *****/

  checkInStorage(key) {
    if (localStorage.getItem(this.storage_prefix + key) != null) return true;

    return false;
  }

  getFromStorage(key, isJson = true) {
    if (isJson) {
      return JSON.parse(localStorage.getItem(this.storage_prefix + key));
    }

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
