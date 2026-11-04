"""Original EZPZ procedural models. Run with Blender --background --python this_file."""
import bpy, math, json, os
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def clear():
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    for m in list(bpy.data.materials): bpy.data.materials.remove(m)

def mat(name,color,metal=0,rough=.4):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    return m

def group(name):
    o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o['part']=name; return o

def finish(o,m,parent=None):
    o.data.materials.append(m)
    if parent:o.parent=parent
    if o.type=='MESH':
        for p in o.data.polygons:p.use_smooth=True
    return o

def mesh(name,vs,fs,m,parent):
    me=bpy.data.meshes.new(name); me.from_pydata(vs,[],fs); me.update(); o=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(o); return finish(o,m,parent)

def cube(name,loc,scale,m,parent,bevel=.04):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('Machined edge','BEVEL');mod.width=bevel;mod.segments=4
        mod=o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,m,parent)

def cyl(name,loc,r,depth,m,parent,axis='X',vertices=64):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc)
    o=bpy.context.object;o.name=name
    if axis=='X':o.rotation_euler[1]=math.pi/2
    elif axis=='Y':o.rotation_euler[0]=math.pi/2
    b=o.modifiers.new('Edge radius','BEVEL');b.width=min(.012,depth*.15);b.segments=3
    o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return finish(o,m,parent)

def tube(name,points,r,m,parent):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=1;c.bevel_depth=r;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);finish(o,m,parent)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
    return o

def oval_yz(t,ry,rz,power=.78):
    c,s=math.cos(t),math.sin(t)
    return ry*math.copysign(abs(c)**power,c),rz*math.copysign(abs(s)**power,s)

def shell(name,x,z,ry,rz,profiles,m,parent,sign=1):
    n=96;vs=[];fs=[]
    for dx,sz in profiles:
        for j in range(n):
            y,zz=oval_yz(j*2*math.pi/n,ry*sz,rz*sz);vs.append((x+sign*dx,y,z+zz))
    for k in range(len(profiles)-1):
        for j in range(n):a=k*n+j;b=k*n+(j+1)%n;fs.append((a,b,b+n,a+n))
    fs += [tuple(reversed(range(n))),tuple((len(profiles)-1)*n+j for j in range(n))]
    o=mesh(name,vs,fs,m,parent)
    o.data.polygons[-1].use_smooth=False; o.data.polygons[-2].use_smooth=False
    return o

def cushion(name,x,z,ry,rz,m,parent):
    n=96;q=20;vs=[];fs=[]
    for j in range(n):
        t=j*math.tau/n
        for k in range(q):
            a=k*math.tau/q;y,zz=oval_yz(t,ry+.115*math.cos(a),rz+.115*math.cos(a));vs.append((x+.135*math.sin(a),y,z+zz))
    for j in range(n):
        for k in range(q):fs.append((j*q+k,((j+1)%n)*q+k,((j+1)%n)*q+(k+1)%q,j*q+(k+1)%q))
    return mesh(name,vs,fs,m,parent)

def arch(name,rx,rz,z0,width,thick,m,parent):
    n=96;vs=[];fs=[]
    for i in range(n+1):
        t=i*math.pi/n
        for r,y in [(-thick/2,-width/2),(-thick/2,width/2),(thick/2,width/2),(thick/2,-width/2)]:
            vs.append(((rx+r)*math.cos(t),y,z0+(rz+r)*math.sin(t)))
    for i in range(n):
        for k in range(4):a=i*4+k;b=i*4+(k+1)%4;fs.append((a,b,b+4,a+4))
    fs.extend([(3,2,1,0),tuple(n*4+k for k in range(4))]);o=mesh(name,vs,fs,m,parent)
    b=o.modifiers.new('Rounded band edges','BEVEL');b.width=.028;b.segments=3;o.modifiers.new('Band normals','WEIGHTED_NORMAL');return o

def text_mesh(text,loc,size,matl,parent,rotation=(0,0,0),extrude=.001):
    bpy.ops.object.text_add(location=loc,rotation=rotation);o=bpy.context.object;o.name='Native typography '+text;o.data.body=text;
    font_path=os.environ.get('EZPZ_FONT','/System/Library/Fonts/Supplemental/Arial Bold.ttf')
    if Path(font_path).exists():o.data.font=bpy.data.fonts.load(font_path)
    o.data.align_x='CENTER';o.data.align_y='CENTER';o.data.size=size;o.data.extrude=extrude;o.data.bevel_depth=.0005
    finish(o,matl,parent);bpy.ops.object.convert(target='MESH');return o

def save(name):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender'/f'{name}.blend'))
    # Preserve fully separated editable source; merge export meshes per part/material.
    for root in [o for o in bpy.data.objects if o.type=='EMPTY']:
        batches={}
        for child in list(root.children):
            if child.type=='MESH' and len(child.data.materials)==1:
                batches.setdefault(child.data.materials[0].name,[]).append(child)
        for objects in batches.values():
            bpy.ops.object.select_all(action='DESELECT')
            for o in objects:o.select_set(True)
            bpy.context.view_layer.objects.active=objects[0]
            bpy.ops.object.convert(target='MESH')
            if len(objects)>1:bpy.ops.object.join()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=str(ROOT/'public/models'/f'{name}.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_yup=True)
    print('EXPORTED',name,len(bpy.data.objects),'objects')

clear()
silver=mat('Finish / satin aluminum',(.53,.57,.6),.87,.28)
edge=mat('Finish / polished aluminum',(.74,.77,.8),.95,.19)
black=mat('Cushion / charcoal leather',(.025,.028,.03),0,.75)
fabric=mat('Acoustic / woven graphite',(.052,.058,.064),0,.94)
dark=mat('Frame / graphite',(.055,.063,.072),.6,.32)
copper=mat('Voice coil / copper',(.53,.22,.075),.82,.27)
board=mat('PCB / forest green',(.035,.075,.055),.12,.55)
gold=mat('Contacts / gold',(.64,.39,.13),.8,.26)
chassis=group('headband')
arch('Continuous aluminum arch',1.35,1.4,.9,.36,.1,silver,chassis)
arch('Soft underside',1.35,1.34,.9,.34,.1,black,chassis)
for side in [-1,1]:
    s='left' if side<0 else 'right';x=side*1.35;z=.27
    # Slender telescoping stems and a curved fork cradle.
    for y in [-.24,.24]:
        tube(s+' yoke',[(x,y,.99),(x,y,.8),(side*1.42,y,.65),(side*1.46,y,.36)],.033,edge,chassis)
        cyl('Pivot pin',(side*1.47,y,.35),.06,.06,dark,chassis)
    shellgroup=group('shell_'+s)
    shell('Sculpted outer housing',side*1.35,z,.49,.64,[(0,1),(.08,1.015),(.16,.98),(.21,.87)],silver,shellgroup,side)
    shell('Polished perimeter',side*1.355,z,.49,.64,[(0,1.016),(.017,1.016)],edge,shellgroup,side)
    shell('Recessed inner face',side*1.35,z,.445,.59,[(-.01,1),(-.035,1)],dark,shellgroup,side)
    # Fine slot vent, real geometry, and physical buttons.
    for j in range(7):cube('Vent slot',(side*1.56,-.17+j*.055,.72),(.004,.022,.055),dark,shellgroup,.008)
    cyl('Control dial',(side*1.57,.27,.04),.065,.025,edge,shellgroup)
    # Modelled typographic wordmark on outer shell, not a generated texture.
    text_mesh('EZPZ',(side*1.565,0,.27),.12,dark,shellgroup,(math.pi/2,0,side*math.pi/2))
    driver=group('driver_'+s)
    shell('Driver mounting plate',side*1.26,z,.45,.59,[(0,1),(.04,1)],dark,driver,side)
    cyl('Driver suspension',(side*1.24,0,z),.33,.04,black,driver)
    cyl('Titanium diaphragm',(side*1.21,0,z),.275,.035,edge,driver)
    for rr in [.09,.125,.17,.22,.28]:
        tube('Diaphragm concentric ring',[(side*1.185,rr*math.cos(t*math.tau/80),z+rr*math.sin(t*math.tau/80)) for t in range(81)],.006,dark,driver)
    cyl('Voice coil',(side*1.322,0,z),.16,.055,copper,driver)
    for rr in [.18,.22,.28]:
        tube('Outer driver coil',[(side*1.315,rr*math.cos(t*math.tau/80),z+rr*math.sin(t*math.tau/80)) for t in range(81)],.012,copper,driver)
    for j in range(12):
        t=j*math.tau/12; cyl('Driver vent',(side*1.305,.37*math.cos(t),z+.48*math.sin(t)),.027,.006,black,driver,vertices=16)
    for yy,zz in [(-.32,.68),(.32,.68),(-.32,-.14),(.32,-.14)]:
        cyl('Precision fastener',(side*1.228,yy,zz),.027,.012,edge,driver,vertices=16)
    pcb=group('electronics_'+s)
    cube('Controller board',(side*1.34,0,z),(.035,.52,.67),board,pcb,.05)
    for j in range(3):
        cube('Controller package',(side*1.375,-.12+j*.12,.29),(.04,.08,.16),dark,pcb,.006)
        for k in range(5): cube('Gold contacts',(side*1.40,-.15+j*.12+k*.014,.18),(.008,.006,.035),gold,pcb,.002)
    cushiongroup=group('cushion_'+s)
    shell('Acoustic cloth',(side*1.08),z,.385,.53,[(0,1),(.012,1)],fabric,cushiongroup,side)
    cushion('Memory foam ear cushion',side*.99,z,.365,.51,black,cushiongroup)
    # A real stitched edge, kept restrained.
    for j in range(64):
        t=j*math.tau/64;y,zz=oval_yz(t,.375,.52)
        y2,zz2=oval_yz(t+.018,.375,.52)
        tube('Cushion stitching',[(side*.86,y,z+zz),(side*.86,y2,z+zz2)],.0028,fabric,cushiongroup)
save('headphones')

clear()
cream=mat('Finish / ceramic',(.68,.65,.58),.35,.29)
ink=mat('Housing / obsidian',(.055,.061,.072),.45,.3)
red=mat('Stem / vermilion',(.8,.08,.035),.15,.32)
gold=mat('Contacts / brass',(.65,.38,.1),.87,.23)
steel=mat('Spring / steel',(.5,.53,.57),.95,.2)
cap=group('keycap');cube('Sculpted keycap',(0,0,1.25),(1.7,1.7,.58),cream,cap,.18)
text_mesh('EZPZ',(0,-.05,1.548),.31,ink,cap)
top=group('top');cube('Top housing',(0,0,.62),(1.45,1.45,.38),ink,top,.12)
for x in [-.69,.69]:cube('Housing clip',(x,0,.6),(.12,.53,.35),ink,top,.025)
stem=group('stem');cube('Slider body',(0,0,.53),(.55,.55,.44),red,stem,.04)
cube('Cross mount x',(0,0,.91),(.53,.17,.43),red,stem,.025);cube('Cross mount y',(0,0,.91),(.17,.53,.43),red,stem,.025)
spring=group('spring')
tube('Helical return spring',[(.23*math.cos(t/300*math.tau*7),.23*math.sin(t/300*math.tau*7),.03+t/300*.48) for t in range(301)],.023,steel,spring)
base=group('base');cube('Base housing',(0,0,.02),(1.5,1.5,.8),ink,base,.13)
for x in [-.37,.37]:
    cube('Gold leaf contact',(x,0,.13),(.04,.55,.42),gold,base,.015)
    cyl('Solder pin',(x,-.15,-.57),.04,.43,gold,base,axis='Z',vertices=24)
save('switch')

clear()
blue=mat('Finish / cobalt enamel',(.025,.08,.68),.65,.22)
metal=mat('Core / silver',(.6,.64,.7),.91,.24)
black=mat('Backing / charcoal',(.018,.024,.038),.25,.5)
for name,z,m in [('face',.38,blue),('core',.06,metal),('back',-.23,black)]:
    g=group(name)
    text_mesh('EZPZ',(0,0,z),1.8,m,g,extrude=.08)
    # Center the four-letter object and make the body generous.
    o=bpy.context.object;o.data.transform(__import__('mathutils').Matrix.Scale(1,4))
save('emblem')
