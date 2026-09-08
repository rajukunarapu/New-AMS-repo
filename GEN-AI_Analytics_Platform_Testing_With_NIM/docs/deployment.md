# Deployment Guide - SAP BTP Cloud Foundry

## MTA Packaging & Cloud Foundry Deployment

### Prerequisites
1. SAP BTP CLI / Cloud Foundry CLI installed (`cf login`).
2. Cloud MTA Build Tool (`mbt`) installed.

### Build Step
Run MTA build from root directory:
```bash
mbt build -t ./
```

### Deploy to BTP CF Space
```bash
cf deploy GEN-AI-Analytics-Platform_1.0.0.mtar
```

### Bound Services
- `GEN-AI-Analytics-Platform-hdi`: SAP HANA Cloud HDI Container
- `GEN-AI-Analytics-Platform-destination`: BTP Destination Service
- `GEN-AI-Analytics-Platform-html5-host`: HTML5 Application Repository
- `GEN-AI-Analytics-Platform-aicore`: SAP AI Core Service binding
