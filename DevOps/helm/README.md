This is file contains veta origin helm, we're using a mono-repo structure and this is how the structure looks like:



helm/

  microservices/
  
    Chart.yaml
    values.yaml

    templates/
      _helpers.tpl

      users-deployment.yaml
      plans-deployment.yaml
      subscriptions-deployment.yaml
      payments-deployment.yaml
      usage-deployment.yaml
      chat-deployment.yaml
      messages-deployment.yaml

      users-service.yaml
      plans-service.yaml
      subscriptions-service.yaml
      payments-service.yaml
      usage-service.yaml
      chat-service.yaml
      messages-service.yaml


