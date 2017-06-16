# loopback-bluemix

Utilities for generating generate Bluemix artefacts

## Installation

```sh
npm install loopback-bluemix
```

## Testing

Before testing:

```
npm run create-bm-fixtures
```

To delete the fixtures:

```
npm run delete-bm-fixtures
```

## API

`loopback-bluemix` exports the following properties and methods.

### Properties

- `templatesDir`: Path to the `templates` directory of the module
- `ds`: Exports methods for prompting Bluemix datasource details
  - `selectBluemixDatasource`: Present Bluemix datasource selection options
  - `promptServiceName`: Prompt new Bluemix service details
  - `getServicePlans`: Get plans for supported data services
  - `promptServicePlan`: Prompt plan for new Bluemix service
  - `provisionService`: Provision new service
  - `bindServiceToApp`: Bind data service to current app (if already on Bluemix)
  - `addDatasource`: Add datasource to datasources-config.json
  - `updatePipeline`: Update the pipeline.yml file
- `cf`: Exports methods for making requests to the Cloud Foundry API
  - `bindService`: Bind a service to an app
  - `getApps`: Get apps for the given parent
  - `getCfConfig`: Load ~/.cf/config.json
  - `getDataServices`: Get data management services with corresponding plans
  - `getDataServiceInstances`: Get data services for the given parent
  - `getPath`: Get resource path for the given parent and child
  - `getOrganizations`: Get all orgs
  - `getResource`: Get a cloud foundry resource
  - `getSpaces`: Get spaces for the given parent
  - `getServices`: Get services for the given parent
  - `getServiceInstances`: Get service instances for the given parent
  - `getServicePlans`: Get service plans for the given parent
  - `getSupportedServices`: Get supported data services
  - `invokeResource`: Invoke a cloud foundry resource
  - `login`: Log into Cloud Foundry
  - `provisionService`: Provision a service

### Methods

- `addDefaultServices`: Method for adding optional default services to the app
- `generateBluemixFiles`: Method for generating Bluemix files and directory

## LICENSE

[MIT](LICENSE)
