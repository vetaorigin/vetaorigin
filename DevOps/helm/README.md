This is file contains veta origin helm, we're using a mono-repo structure and this is how the structure looks like:


helm/

  microservices/
  
    Chart.yaml
    
    values.yaml
    
    templates/
      _helpers.tpl

      auth-deployment.yaml
      auth-service.yaml

      user-deployment.yaml
      user-service.yaml

      content-deployment.yaml
      content-service.yaml

      api-gateway-deployment.yaml
      api-gateway-service.yaml

      notification-deployment.yaml
      notification-service.yaml

      email-deployment.yaml
      email-service.yaml

