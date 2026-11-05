using UnityEngine;
using UnityEngine.Rendering;

namespace PixelFX.Brazier.AnimatedParticles
{
    /// <summary>Rotate only a zero-offset local particle plane, never the firemouth world anchor.</summary>
    [ExecuteAlways]
    public sealed class BrazierCameraLayout : MonoBehaviour
    {
        public Material facingMaterial;
        void OnEnable() { RenderPipelineManager.beginCameraRendering+=BeforeCamera; }
        void OnDisable() { RenderPipelineManager.beginCameraRendering-=BeforeCamera; }
        void BeforeCamera(ScriptableRenderContext context,Camera camera)
        {
            if (!facingMaterial || !camera) return;
            transform.rotation=facingMaterial.GetFloat("_FaceCamera")>.5f
                ? Quaternion.LookRotation(camera.transform.forward,Vector3.up) : transform.parent.rotation;
        }
    }
}
