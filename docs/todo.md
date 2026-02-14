You are a senior graphics engineer specializing in Three.js and large-scale data visualization.

We already have a basic 3D scene rendering file points, but:

- The spiral layout is wrong.
- Zoom does not move the camera toward clicked files.
- Objects do not scale or reveal previews correctly.

We must redesign the spatial model and interaction system.

GOALS:

1) Replace spiral layout with a true 3D cosmos distribution:
   - Large files near center
   - Small files farther away
   - Files distributed in a spherical volume (not flat)
   - Slight randomness, organic, cloud-like

2) Position formula:

   radius = map(fileSize, minSize → maxSize, outerRadius → innerRadius)
   theta = random(0 → 2π)
   phi = acos(2 * random() - 1)

   x = radius * sin(phi) * cos(theta)
   y = radius * sin(phi) * sin(theta)
   z = radius * cos(phi)

3) Interaction:

   - Click on any file:
       → Camera smoothly lerps toward that file
       → File becomes centered
       → Surrounding files fade slightly

   - Mouse wheel:
       → Dolly forward/backward
       → Not orbit

4) Zoom Behavior:

   Distance > FAR:
       show glowing dot

   MID distance:
       show square plane

   NEAR distance:
       load thumbnail texture

5) Implement camera flight:

   targetPosition = file.position + normalize(camera.position - file.position) * focusDistance

   Use damping / lerp in useFrame.

6) Rendering:

   - InstancedMesh for dots
   - Separate mesh pool for near items
   - Frustum culling
   - Spatial hash grid

7) Visuals:

   - Subtle volumetric fog
   - Faint starfield
   - Add bloom

8) UX:

   - On hover show filename
   - On click zoom + center
   - ESC returns to free navigation

OUTPUT:

- New position generator function
- Camera controller hook
- LOD switching logic
- Click-to-focus implementation
- Example React Three Fiber components


Add cinematic feel:

- Slow drifting motion
- Perlin noise wobble
- Depth-of-field
- Soft bloom halo
- Slight parallax star background
