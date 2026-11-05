using UnityEngine;

namespace PixelFX.Brazier
{
    /// <summary>Two synchronized color/glow cards. No instantiated materials or per-frame allocations.</summary>
    [ExecuteAlways]
    [DisallowMultipleComponent]
    public sealed class BrazierFlipbook : MonoBehaviour
    {
        public Renderer colorLayer;
        public Renderer glowLayer;
        public Light fireLight;
        [Min(1)] public int frameCount = 90;
        [Min(1)] public float framesPerSecond = 30;
        [Min(0)] public float speed = 1;
        [Range(0, 1)] public float phaseOffset;
        [Tooltip("Rotates around world Y only. This is a 2.5D effect, not a volumetric simulation.")]
        public bool billboard = true;
        public bool previewInEditor = true;
        [Min(0)] public float lightIntensity = 2.2f;
        public int CurrentFrame { get; private set; }

        static readonly int FrameID = Shader.PropertyToID("_Frame");
        MaterialPropertyBlock properties;
        double startTime;
        int lastFrame = -1;

        double Clock
        {
            get
            {
#if UNITY_EDITOR
                if (!Application.isPlaying) return UnityEditor.EditorApplication.timeSinceStartup;
#endif
                return Time.timeAsDouble;
            }
        }

        void OnEnable()
        {
            startTime = Clock;
            lastFrame = -1;
            properties = new MaterialPropertyBlock();
#if UNITY_EDITOR
            UnityEditor.EditorApplication.update += EditorTick;
#endif
            Tick();
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
            if (Application.isPlaying || !previewInEditor) return;
            Tick();
            UnityEditor.EditorApplication.QueuePlayerLoopUpdate();
            UnityEditor.SceneView.RepaintAll();
        }
#endif

        void LateUpdate()
        {
            if (Application.isPlaying) Tick();
        }

        void Tick()
        {
            var time = (Clock - startTime) * speed + phaseOffset * frameCount / framesPerSecond;
            CurrentFrame = (int)(time * framesPerSecond) % frameCount;
            if (CurrentFrame != lastFrame)
            {
                properties.SetFloat(FrameID, CurrentFrame);
                if (colorLayer) colorLayer.SetPropertyBlock(properties);
                if (glowLayer) glowLayer.SetPropertyBlock(properties);
                lastFrame = CurrentFrame;
            }

            // Only property blocks are animated in Edit Mode; do not dirty scene transforms/lights.
            if (billboard && Application.isPlaying)
            {
                var camera = Camera.main;
#if UNITY_EDITOR
                if (!Application.isPlaying && UnityEditor.SceneView.lastActiveSceneView != null
                    && UnityEditor.SceneView.lastActiveSceneView.hasFocus)
                    camera = UnityEditor.SceneView.lastActiveSceneView.camera;
#endif
                if (camera)
                {
                    var direction = transform.position - camera.transform.position;
                    direction.y = 0;
                    if (direction.sqrMagnitude > 0.0001f)
                        transform.rotation = Quaternion.LookRotation(direction, Vector3.up);
                }
            }
            if (fireLight && Application.isPlaying)
                fireLight.intensity = lightIntensity * (0.88f + 0.08f * Mathf.Sin((float)time * Mathf.PI * 4 / 3)
                    + 0.04f * Mathf.Sin((float)time * Mathf.PI * 14 / 3));
        }
    }
}
