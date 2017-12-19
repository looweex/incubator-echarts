import {bind, each} from 'zrender/src/core/util';
import Group from 'zrender/src/container/Group';
import * as componentUtil from '../util/component';
import * as clazzUtil from '../util/clazz';
import * as modelUtil from '../util/model';
import {createTask} from '../stream/task';

var inner = modelUtil.makeInner();

function Chart() {

    /**
     * @type {module:zrender/container/Group}
     * @readOnly
     */
    this.group = new Group();

    /**
     * @type {string}
     * @readOnly
     */
    this.uid = componentUtil.getUID('viewChart');

    this.renderTask = createTask({
        reset: bind(this.renderTaskReset, this),
        progress: bind(this.renderTaskProgress, this)
    }, {view: this});
}

Chart.prototype = {

    type: 'chart',

    /**
     * Init the chart
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    init: function (ecModel, api) {},

    /**
     * Render the chart
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    render: function (seriesModel, ecModel, api, payload) {},

    /**
     * Highlight series or specified data item
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    highlight: function (seriesModel, ecModel, api, payload) {
        toggleHighlight(seriesModel.getData(), payload, 'emphasis');
    },

    /**
     * Downplay series or specified data item
     * @param  {module:echarts/model/Series} seriesModel
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     * @param  {Object} payload
     */
    downplay: function (seriesModel, ecModel, api, payload) {
        toggleHighlight(seriesModel.getData(), payload, 'normal');
    },

    /**
     * Remove self
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    remove: function (ecModel, api) {
        this.group.removeAll();
    },

    /**
     * Dispose self
     * @param  {module:echarts/model/Global} ecModel
     * @param  {module:echarts/ExtensionAPI} api
     */
    dispose: function () {},

    /**
     * @protected
     */
    renderTaskReset: function (context) {
        var seriesModel = context.model;
        var ecModel = context.ecModel;
        var api = context.api;
        var payload = context.payload;
        // ???! remove updateView updateVisual
        var incremental = context.incremental;

        if (inner(this).incremental ^ incremental) {
            this.remove(ecModel, api);
        }
        inner(this).incremental = incremental;

        var updateMethod = payload && inner(payload).updateMethod;
        var methodName = incremental
            ? ((updateMethod && this.incrementalPrepareLayout)
                ? 'incrementalPrepareLayout' : 'incrementalPrepareRender'
            )
            : ((updateMethod && this[updateMethod])
                ? updateMethod : 'render'
            );

        return this[methodName](seriesModel, ecModel, api, payload)
            || (!incremental && {noProgress: true});
    },

    /**
     * @protected
     */
    renderTaskProgress: function (params, context) {
        var seriesModel = context.model;
        var ecModel = context.ecModel;
        var api = context.api;
        var payload = context.payload;
        var updateMethod = payload && inner(payload).updateMethod;
        var methodName = (updateMethod && this.incrementalLayout)
            ? 'incrementalLayout' : 'incrementalRender';

        this[methodName](params, seriesModel, ecModel, api, payload);
    },

    incrementalPrepareRender: null,

    incrementalRender: null,

    incrementalPrepareLayout: null,

    incrementalLayout: null,

    /**
     * The view contains the given point.
     * @interface
     * @param {Array.<number>} point
     * @return {boolean}
     */
    // containPoint: function () {}

};

var chartProto = Chart.prototype;
chartProto.updateView
    = chartProto.updateLayout
    = chartProto.updateVisual
    = function (seriesModel, ecModel, api, payload) {
        this.render(seriesModel, ecModel, api, payload);
    };

/**
 * Set state of single element
 * @param  {module:zrender/Element} el
 * @param  {string} state
 */
function elSetState(el, state) {
    if (el) {
        el.trigger(state);
        if (el.type === 'group') {
            for (var i = 0; i < el.childCount(); i++) {
                elSetState(el.childAt(i), state);
            }
        }
    }
}
/**
 * @param  {module:echarts/data/List} data
 * @param  {Object} payload
 * @param  {string} state 'normal'|'emphasis'
 * @inner
 */
function toggleHighlight(data, payload, state) {
    var dataIndex = modelUtil.queryDataIndex(data, payload);

    if (dataIndex != null) {
        each(modelUtil.normalizeToArray(dataIndex), function (dataIdx) {
            elSetState(data.getItemGraphicEl(dataIdx), state);
        });
    }
    else {
        data.eachItemGraphicEl(function (el) {
            elSetState(el, state);
        });
    }
}

// Enable Chart.extend.
clazzUtil.enableClassExtend(Chart, ['dispose']);

// Add capability of registerClass, getClass, hasClass, registerSubTypeDefaulter and so on.
clazzUtil.enableClassManagement(Chart, {registerWhenExtend: true});

Chart.markUpdateMethod = function (payload, methodName) {
    inner(payload).updateMethod = methodName;
};

export default Chart;