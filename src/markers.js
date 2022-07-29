export default class Marker {

    constructor(environment, options) {

        this.environment = environment;

        this.coords = { lat: options.lat, lng: options.lng };

        // La instancia representa el tipo de marcador creado para editar y customizar
        this.instance = options.icon
                  ? new H.map.DomMarker(this.coords, { icon: new H.map.DomIcon(options.icon) })
                  : new H.map.Marker(this.coords);

        this.instance.setData(options.data);

        if (options.draggable) this.makeDraggable();

        if (options.bubble) this.addBubble(options.bubble);

        if (!options.render || options.render != false) this.render();

    }

    /**
     * Renderiza el marcador en el grupo actual del mapa
     */
    render() {
        this.environment.group.addObject(this.instance);
    }

    /**
     * Aplica las funcionalidades basicas para hacer que el marcador sea arrastrable por el mapa
     * @param {function|false} onDragged Un callback opcional que retorna las nuevas coordenadas
     * del marcador luego de haber sido arrastrado
     */
    makeDraggable(onDragged = false) {

        this.instance.draggable = true;

        this.instance.setVolatility(true);

        this.instance.addEventListener("dragstart", (evt) => {

            let target  = evt.target,
                pointer = evt.currentPointer;

            let targetPosition = this.environment.map.geoToScreen(this.coords);
    
            target['offset'] = new H.math.Point(
                pointer.viewportX - targetPosition.x, pointer.viewportY - targetPosition.y
            );
    
            this.environment.behavior.disable();

        });

        this.instance.addEventListener('dragend', () => {

            this.coords = this.instance.getGeometry();
    
            this.environment.behavior.enable();

            if (onDragged && typeof onDragged === 'function') onDragged(this.coords);
    
        });

        this.instance.addEventListener('drag', (evt) => {

            let target  = evt.target,
                pointer = evt.currentPointer;

            this.instance.setGeometry(
                this.environment.map.screenToGeo(
                    pointer.viewportX - target['offset'].x, pointer.viewportY - target['offset'].y
                )
            );
            
        });
    }

    addBubble(content) {

        this.instance.addEventListener('tap', () => {

            const bubble = new H.ui.InfoBubble(this.coords, { 
              content: `
                <div class="here-quick-bubble">
                  ${content}
                </div>`
            });
      
            this.environment.ui.addBubble(bubble)

        });

    }

}