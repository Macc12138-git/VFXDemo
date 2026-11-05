using UnityEngine;
using UnityEngine.Rendering;

namespace PixelFX.Brazier.Particles
{
    /// <summary>Faces the emission layout, not just individual quads. Local particle simulation
    /// remains native Shuriken. Applied per camera and restored after rendering, so roots and
    /// user-edited layer offsets are not permanently rotated or serialized as preview state.</summary>
    [ExecuteAlways]
    [DisallowMultipleComponent]
    public sealed class ParticleLayerFacing : MonoBehaviour
    {
        public Material facingMaterial;
        static readonly int FaceCamera = Shader.PropertyToID("_FaceCamera");
        Vector3 savedPosition;
        Quaternion savedRotation;
        Camera renderingCamera;

        void OnEnable()
        {
            RenderPipelineManager.beginCameraRendering += BeginCamera;
            RenderPipelineManager.endCameraRendering += EndCamera;
        }

        void OnDisable()
        {
            RenderPipelineManager.beginCameraRendering -= BeginCamera;
            RenderPipelineManager.endCameraRendering -= EndCamera;
            Restore();
        }

        void BeginCamera(ScriptableRenderContext context, Camera camera)
        {
            if (!facingMaterial || facingMaterial.GetFloat(FaceCamera) < 0.5f || !transform.parent) return;
            savedPosition = transform.localPosition;
            savedRotation = transform.localRotation;
            renderingCamera = camera;
            var parent = transform.parent;
            transform.SetPositionAndRotation(parent.position + camera.transform.rotation
                * Vector3.Scale(savedPosition, parent.lossyScale), camera.transform.rotation);
        }

        void EndCamera(ScriptableRenderContext context, Camera camera)
        {
            if (renderingCamera == camera) Restore();
        }

        void Restore()
        {
            if (!renderingCamera) return;
            transform.localPosition = savedPosition;
            transform.localRotation = savedRotation;
            renderingCamera = null;
        }
    }
}
