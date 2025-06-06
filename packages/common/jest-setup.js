const fetch = require('node-fetch');
const React = require('react');
const ReactDOM = require('react-dom');

global.React = React;
global.ReactDOM = ReactDOM;

const createMockNode = () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  appendChild: jest.fn(),
  removeChild: jest.fn(),
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  style: {}
});

const mockWidget = {
  constructor() {
    this.node = createMockNode();
  },
  addClass() {},
  removeClass() {},
  update() {},
  dispose() {},
  node: createMockNode()
};

const mockSignal = {
  connect() {
    return true;
  },
  disconnect() {
    return true;
  },
  emit() {}
};

jest.mock('@jupyterlab/ui-components', () => ({
  VDomRenderer: class {
    constructor(model) {
      this._model = model;
      this.node = createMockNode();
    }
    addClass() {}
    removeClass() {}
    update() {}
    dispose() {}
    render() {
      return null;
    }
    get model() {
      return this._model;
    }
  },
  VDomModel: class {
    constructor() {
      this.stateChanged = mockSignal;
    }
  },
  Widget: mockWidget
}));

jest.mock('@jupyterlab/apputils', () => ({
  VDomRenderer: class {
    constructor(model) {
      this._model = model;
      this.node = createMockNode();
    }
    addClass() {}
    removeClass() {}
    update() {}
    dispose() {}
    render() {
      return null;
    }
    get model() {
      return this._model;
    }
  },
  Dialog: {
    flush: jest.fn()
  },
  showDialog: jest.fn(),
  Toolbar: class {
    constructor() {
      this.node = createMockNode();
    }
    addItem() {}
  },
  ToolbarButton: class {
    constructor() {
      this.node = createMockNode();
    }
  },
  MainAreaWidget: class {
    constructor() {
      this.node = createMockNode();
    }
  }
}));

jest.mock('@jupyterlab/services', () => ({
  ServerConnection: {
    makeRequest: jest.fn(),
    makeSettings: jest.fn().mockReturnValue({
      baseUrl: 'http://localhost:8888'
    })
  },
  Session: {
    connectTo: jest.fn(),
    shutdownAll: jest.fn()
  },
  Kernel: {
    connectTo: jest.fn()
  }
}));

jest.mock('@jupyterlab/settingregistry', () => {
  const Settings = jest.fn().mockImplementation(() => ({
    changed: mockSignal,
    get: jest.fn().mockReturnValue({}),
    set: jest.fn().mockResolvedValue(undefined)
  }));

  return {
    Settings
  };
});

jest.mock('@jupyterlab/testutils', () => ({
  testEmission: jest.fn((signal, test) => {
    if (test) {
      test();
    }
    return Promise.resolve();
  }),
  JupyterServer: class {
    constructor() {}
    async start() {}
    async shutdown() {}
  }
}));

jest.mock('@lumino/widgets', () => ({
  Widget: class {
    constructor() {
      this.node = createMockNode();
    }
    addClass() {}
    removeClass() {}
    update() {}
    dispose() {}
  }
}));

jest.mock('@lumino/signaling', () => ({
  Signal: class {
    connect() {
      return true;
    }
    disconnect() {
      return true;
    }
    emit() {}
  }
}));

class MockDragEvent extends Event {
  constructor(type, eventInitDict) {
    super(type, eventInitDict);
    this.dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
      setDragImage: jest.fn()
    };
  }
}

global.requestAnimationFrame = callback => setTimeout(callback, 0);
global.cancelAnimationFrame = id => clearTimeout(id);

global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

global.DragEvent = MockDragEvent;
global.fetch = fetch;
global.Request = fetch.Request;
global.Response = fetch.Response;
global.Headers = fetch.Headers;

global.getComputedStyle = element => ({
  getPropertyValue: prop => ''
});
