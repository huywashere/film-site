#!/usr/bin/env bash

if [[ "${ENABLE_K8S_DEPLOY:-false}" != "true" ]]; then
  echo "Kubernetes deployment is disabled for the current VPS architecture."
  echo "Set ENABLE_K8S_DEPLOY=true only after a cluster and its secrets are ready."
  exit 1
fi

# FlexPhim One-Click Production Kubernetes Deployment Script
set -e

echo "🚀 Deploying FlexPhim Production Cluster to Kubernetes..."

if [[ ! "${IMAGE_TAG:-}" =~ ^[a-f0-9]{7,64}$ ]]; then
  echo "IMAGE_TAG must be an immutable Git commit SHA." >&2
  exit 1
fi

K8S_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

kubectl apply -f "$K8S_DIR/namespace.yaml"
kubectl apply -f "$K8S_DIR/configmap.yaml"
if [ ! -f "$K8S_DIR/secret.yaml" ]; then
  echo "Missing infra/kubernetes/secret.yaml. Create it from secret.example.yaml using a secure secret store." >&2
  exit 1
fi
kubectl apply -f "$K8S_DIR/secret.yaml"
kubectl apply -f "$K8S_DIR/redis-deployment.yaml"
sed "s/CHANGE_ME_COMMIT_SHA/$IMAGE_TAG/g" "$K8S_DIR/api-deployment.yaml" | kubectl apply -f -
sed "s/CHANGE_ME_COMMIT_SHA/$IMAGE_TAG/g" "$K8S_DIR/web-deployment.yaml" | kubectl apply -f -
kubectl apply -f "$K8S_DIR/network-policy.yaml"
kubectl apply -f "$K8S_DIR/hpa.yaml"
kubectl apply -f "$K8S_DIR/ingress.yaml"

echo "⏳ Waiting for pods to enter Running state..."
kubectl rollout status deployment/netphim-api -n netphim --timeout=120s
kubectl rollout status deployment/netphim-web -n netphim --timeout=120s

echo "✅ FlexPhim Kubernetes Cluster Deployment Successful!"
kubectl get all -n netphim
