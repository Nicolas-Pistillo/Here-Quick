export default class Cluster {

    constructor(datapoints) {

        this.provider = new H.clustering.Provider(datapoints, {
            clusteringOptions: {
              eps: 64,
              minWeight: 3,
            },
        });

        this.layer = new H.map.layer.ObjectLayer(this.provider);

    }

    /**
     * Agrega uno o varios datapoints al proveedor del cluster actual 
     * @param {DataPoint[]|DataPoint} datapoints 
     */
    add(datapoints) {

        if (Array.isArray(datapoints)) return this.provider.addDataPoints(datapoints);

        this.provider.addDataPoint(datapoints);

    }

    /**
     * Elimina un datapoint del proveedor actual
     * @param {DataPoint} datapoint El datapoint a eliminar (debe existir en el proveedor)
     */
    remove(datapoint) {
        this.provider.removeDataPoint(datapoint);
    }

    /**
     * Setea un manejador de eventos de tipo click que retorna las coordenads y datos
     * del punto o grupo dentro del cluster 
     * @param {Function} callback Una funcion de callback que recibe las coordenadas del target 
     * y los datos del punto o puntos de grupo donde se hizo click
     */
    onClick(callback) {

        this.provider.addEventListener("tap", (evt) => {

            const target = evt.target.getData();

            const position = target.getPosition(); // Coordenadas del objetivo (punto o grupo)

            // Target es un datapoint del cluster
            if (target.constructor.name === "Bt") return callback(position, target.getData());

            // Target es un grupo de datapoints (retornamos los datapoints dentro de este grupo)
            const datapoints = [];

            target.forEachDataPoint((datapoint) => datapoints.push({
                position: datapoint.getPosition(),
                data: datapoint.getData()
            }));

            callback(position, datapoints);

        });
    }

}