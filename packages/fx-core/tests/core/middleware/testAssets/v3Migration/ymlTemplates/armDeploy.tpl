  - uses: arm/deploy  # Deploy given ARM templates parallelly.
    with:
      # AZURE_SUBSCRIPTION_ID is a built-in environment variable,
      # if its value is empty, TeamsFx will prompt you to select a subscription.
      # Referencing other environment variables with empty values
      # will skip the subscription selection prompt.
      subscriptionId: ${{AZURE_SUBSCRIPTION_ID}}
      # AZURE_RESOURCE_GROUP_NAME is a built-in environment variable,
      # if its value is empty, TeamsFx will prompt you to select or create one
      # resource group.
      # Referencing other environment variables with empty values
      # will skip the resource group selection prompt.
      resourceGroupName: ${{AZURE_RESOURCE_GROUP_NAME}}
      templates:
        - path: ./templates/azure/main.bicep  # Relative path to this file
          # Relative path to this yaml file.
          # Placeholders will be replaced with corresponding environment
          # variable before ARM deployment.
          parameters: ./templates/azure/azure.parameters.${{TEAMSFX_ENV}}.json
          # Required when deploying ARM template
          deploymentName: teams_toolkit_deployment
      # Teams Toolkit will download this bicep CLI version from github for you,
      # will use bicep CLI in PATH if you remove this config.
      bicepCliVersion: v0.4.613