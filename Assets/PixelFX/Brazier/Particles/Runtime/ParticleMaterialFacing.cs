using UnityEngine;

namespace PixelFX.Brazier.Particles
{
    /// <summary>Connects a shared material checkbox to Shuriken's per-camera billboard alignment.
    /// It does not simulate particles, rotate the effect root, or instantiate materials.</summary>
    [ExecuteAlways]
    [DisallowMultipleComponent]
    [RequireComponent(typeof(ParticleSystemRenderer))]
    public sealed class ParticleMaterialFacing : MonoBehaviour
    {
        static readonly int FaceCamera = Shader.PropertyToID("_FaceCamera");
        [Tooltip("Optional layer-wide material control. The four primary layer materials control their entire layer.")]
        public Material alignmentMaterial;
        ParticleSystemRenderer particleRenderer;

        void OnEnable()
        {
            particleRenderer = GetComponent<ParticleSystemRenderer>();
            ApplyMaterial();
#if UNITY_EDITOR
            UnityEditor.EditorApplication.update += EditorTick;
#endif
        }

        void OnDisable()
        {
#if UNITY_EDITOR
            UnityEditor.EditorApplication.update -= EditorTick;
#endif
        }

#if UNITY_EDITOR
        void EditorTick()
        {
            if (Application.isPlaying) return;
            if (ApplyMaterial())
            {
                UnityEditor.EditorApplication.QueuePlayerLoopUpdate();
                UnityEditor.SceneView.RepaintAll();
            }
        }
#endif

        void LateUpdate() { ApplyMaterial(); }

        public bool ApplyMaterial()
        {
            if (!particleRenderer) particleRenderer = GetComponent<ParticleSystemRenderer>();
            var material = alignmentMaterial ? alignmentMaterial : particleRenderer.sharedMaterial;
            if (!material || !material.HasProperty(FaceCamera)) return false;
            var alignment = material.GetFloat(FaceCamera) > 0.5f
                ? ParticleSystemRenderSpace.View : ParticleSystemRenderSpace.Local;
            bool changed = particleRenderer.alignment != alignment || particleRenderer.allowRoll;
            if (particleRenderer.alignment != alignment) particleRenderer.alignment = alignment;
            if (particleRenderer.allowRoll) particleRenderer.allowRoll = false;
            return changed;
        }
    }
}
