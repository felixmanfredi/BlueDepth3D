# 📡 Common Interfaces  

**Common Interfaces** defines the core interfaces used across the **MPE Server** ecosystem.  
This repository provides a standardized structure for different components, ensuring modularity, interoperability, and extensibility for various plugins and services.  

## 🏗️ Purpose  

This repository serves as the foundation for components that interact with **MPE Server**, defining interfaces that:  
- Ensure **consistent communication** between different modules.  
- Provide **abstraction layers** to allow flexible implementations.  
- Facilitate the development of **plugins** and **extensions** by enforcing a unified structure.  

## 🔑 Available Interfaces  

Currently, this repository includes interfaces for:  
- **CameraInterface** – Standard interface for camera devices.  
- **StereoCameraInterface** – Interface for stereo camera systems.  
- **LocalizationSystemInterface** – Interface for geolocation systems.  
- **CoreInterface** – Defines the core functionality and interactions with MPE Server.  

Additional interfaces may be introduced as the system evolves.  

## 📥 Usage  

This repository is intended to be used as a dependency in projects that implement MPE-compatible components. Developers creating new plugins or modules should ensure they implement the relevant interfaces from **Common Interfaces** to maintain compatibility.  